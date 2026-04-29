<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ref as dbRef, get, remove, update } from 'firebase/database';
import { database } from '@/services/firebaseConfig';

const returningGardeners = ref([]);
const loading = ref(true);
const actionLoading = ref(false);
const selectedReturningIds = ref([]);
const expandedReturningIds = ref([]);
const returningSortKey = ref('lastName');
const returningSortDirection = ref('asc');
const searchQuery = ref('');
const page = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [
  { title: '15', value: 15 },
  { title: '30', value: 30 },
  { title: '45', value: 45 },
  { title: 'All', value: 'all' }
];

const returningHeaders = [
  { title: 'First name', key: 'firstName' },
  { title: 'Last name', key: 'lastName' },
  { title: 'Email', key: 'email' },
  { title: 'Plots to keep', key: 'plotSummary' },
  { title: 'Status', key: 'status' }
];

const returningHeaderLabels = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  plotSummary: 'Plots to keep',
  status: 'Status'
};

const loadData = async () => {
  loading.value = true;

  try {
    const returningSnapshot = await get(dbRef(database, 'returning-gardeners'));
    returningGardeners.value = returningSnapshot.exists()
      ? Object.entries(returningSnapshot.val())
          .map(([id, data]) => ({
            id,
            ...data,
            status: data.status || 'incomplete',
            plotSummary: data.forgotPlotNumber
              ? 'forgot'
              : (data.plotNumbers || '').trim() || '—',
            partnerName: data.partner?.name || data.partnerName || '',
            partnerEmail: data.partner?.email || data.partnerEmail || ''
          }))
          .sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
            return bTime - aTime;
          })
      : [];
  } catch (error) {
    console.error('Error loading returning gardeners:', error);
  } finally {
    loading.value = false;
  }
};

const filteredReturningGardeners = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return returningGardeners.value;

  return returningGardeners.value.filter((entry) =>
    [
      entry.firstName,
      entry.lastName,
      entry.email,
      entry.plotSummary,
      entry.status
    ].some((value) => String(value ?? '').toLowerCase().includes(query))
  );
});

const sortedReturningGardeners = computed(() => {
  const items = [...filteredReturningGardeners.value];
  const key = returningSortKey.value;
  const direction = returningSortDirection.value === 'asc' ? 1 : -1;

  items.sort((a, b) => {
    const aValue = String(a[key] ?? '').toLowerCase();
    const bValue = String(b[key] ?? '').toLowerCase();
    return aValue.localeCompare(bValue) * direction;
  });

  return items;
});

const totalItems = computed(() => sortedReturningGardeners.value.length);
const totalPages = computed(() => {
  if (pageSize.value === 'all') return 1;
  return Math.max(1, Math.ceil(totalItems.value / Number(pageSize.value)));
});

const paginatedReturningGardeners = computed(() => {
  if (pageSize.value === 'all') return sortedReturningGardeners.value;
  const start = (page.value - 1) * Number(pageSize.value);
  return sortedReturningGardeners.value.slice(start, start + Number(pageSize.value));
});

const selectedReturningGardeners = computed(() =>
  sortedReturningGardeners.value.filter((entry) => selectedReturningIds.value.includes(entry.id))
);

const allReturningSelected = computed(
  () => paginatedReturningGardeners.value.length > 0
    && paginatedReturningGardeners.value.every((entry) => selectedReturningIds.value.includes(entry.id))
);

const someReturningSelected = computed(
  () => paginatedReturningGardeners.value.some((entry) => selectedReturningIds.value.includes(entry.id))
    && !allReturningSelected.value
);

const formatBoolean = (value) => (value ? 'Yes' : 'No');

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return formatBoolean(value);
  }

  return value;
};

const detailRows = (entry) => [
  { label: 'Status', value: entry.status || 'incomplete' },
  { label: 'First name', value: entry.firstName },
  { label: 'Last name', value: entry.lastName },
  { label: 'Email', value: entry.email },
  { label: 'Affiliation', value: entry.affiliation },
  { label: 'Student type', value: entry.studentType },
  { label: 'Had plot last year', value: entry.hadPlotLastYear },
  { label: 'Plots to keep', value: entry.plotSummary },
  { label: 'Forgot plot number', value: entry.forgotPlotNumber },
  { label: "Last year's name", value: entry.lastYearName },
  { label: "Last year's email", value: entry.lastYearEmail },
  { label: 'Sharing plot', value: entry.sharingPlot },
  { label: 'Partner name', value: entry.partnerName },
  { label: 'Partner email', value: entry.partnerEmail },
  { label: 'Agreed to rules', value: entry.agreeRules },
  { label: 'Agreed to liability waiver', value: entry.agreeLiability },
  { label: 'Updated at', value: entry.updatedAt }
];

const isSelected = (id) => selectedReturningIds.value.includes(id);

const isExpanded = (id) => expandedReturningIds.value.includes(id);

const toggleSelected = (id) => {
  if (selectedReturningIds.value.includes(id)) {
    selectedReturningIds.value = selectedReturningIds.value.filter((selectedId) => selectedId !== id);
    return;
  }

  selectedReturningIds.value = [...selectedReturningIds.value, id];
};

const toggleSelectAll = () => {
  if (allReturningSelected.value) {
    const pageIds = new Set(paginatedReturningGardeners.value.map((entry) => entry.id));
    selectedReturningIds.value = selectedReturningIds.value.filter((id) => !pageIds.has(id));
    return;
  }

  const merged = new Set([
    ...selectedReturningIds.value,
    ...paginatedReturningGardeners.value.map((entry) => entry.id)
  ]);
  selectedReturningIds.value = [...merged];
};

const toggleExpanded = (id) => {
  if (expandedReturningIds.value.includes(id)) {
    expandedReturningIds.value = expandedReturningIds.value.filter((expandedId) => expandedId !== id);
    return;
  }

  expandedReturningIds.value = [id];
};

const toggleReturningSort = (key) => {
  if (returningSortKey.value === key) {
    returningSortDirection.value = returningSortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }

  returningSortKey.value = key;
  returningSortDirection.value = 'asc';
};

const sortIcon = (key) => {
  if (returningSortKey.value !== key) {
    return 'mdi-swap-vertical';
  }

  return returningSortDirection.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
};

const updateReturningStatus = async (status) => {
  if (!selectedReturningIds.value.length) {
    window.alert('Select one or more returning gardener entries first.');
    return;
  }

  actionLoading.value = true;

  try {
    const updatedAt = new Date().toISOString();
    await Promise.all(
      selectedReturningIds.value.map((id) =>
        update(dbRef(database, `returning-gardeners/${id}`), { status, updatedAt })
      )
    );

    selectedReturningIds.value = [];
    expandedReturningIds.value = [];
    await loadData();
  } catch (error) {
    console.error('Error updating returning gardener status:', error);
    window.alert('Unable to update the selected entries.');
  } finally {
    actionLoading.value = false;
  }
};

const deleteSelected = async () => {
  if (!selectedReturningIds.value.length) {
    window.alert('Select one or more returning gardener entries first.');
    return;
  }

  if (
    !window.confirm('Delete the selected returning gardener entries? This cannot be undone.')
  ) {
    return;
  }

  actionLoading.value = true;

  try {
    await Promise.all(
      selectedReturningIds.value.map((id) => remove(dbRef(database, `returning-gardeners/${id}`)))
    );

    selectedReturningIds.value = [];
    expandedReturningIds.value = [];
    await loadData();
  } catch (error) {
    console.error('Error deleting returning gardener entries:', error);
    window.alert('Unable to delete the selected entries.');
  } finally {
    actionLoading.value = false;
  }
};

const escapeCsvValue = (value) =>
  `"${String(value ?? '')
    .replaceAll('"', '""')
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')}"`;

const exportReturningGardenersCsv = () => {
  const rows = returningGardeners.value.map((entry) => ({
    id: entry.id,
    status: entry.status || 'incomplete',
    firstName: entry.firstName,
    lastName: entry.lastName,
    email: entry.email,
    affiliation: entry.affiliation,
    studentType: entry.studentType,
    hadPlotLastYear: formatBoolean(entry.hadPlotLastYear),
    plotNumbers: entry.forgotPlotNumber ? 'forgot' : entry.plotNumbers || '',
    forgotPlotNumber: formatBoolean(entry.forgotPlotNumber),
    lastYearName: entry.lastYearName,
    lastYearEmail: entry.lastYearEmail,
    sharingPlot: formatBoolean(entry.sharingPlot),
    partnerName: entry.partnerName,
    partnerEmail: entry.partnerEmail,
    agreeRules: formatBoolean(entry.agreeRules),
    agreeLiability: formatBoolean(entry.agreeLiability),
    updatedAt: entry.updatedAt
  }));

  const columns = [
    'id',
    'status',
    'firstName',
    'lastName',
    'email',
    'affiliation',
    'studentType',
    'hadPlotLastYear',
    'plotNumbers',
    'forgotPlotNumber',
    'lastYearName',
    'lastYearEmail',
    'sharingPlot',
    'partnerName',
    'partnerEmail',
    'agreeRules',
    'agreeLiability',
    'updatedAt'
  ];

  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  link.href = url;
  link.download = `returning_gardeners-${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

onMounted(loadData);

watch([returningSortKey, returningSortDirection, searchQuery], () => {
  page.value = 1;
  selectedReturningIds.value = [];
  expandedReturningIds.value = [];
});

watch(pageSize, () => {
  page.value = 1;
});

</script>

<template>
  <v-card class="pa-4 rounded-lg elevation-1 returning-card">
    <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-2">
      <div class="text-body-2 text-medium-emphasis">Manage returning gardeners.</div>
      <v-btn
        variant="outlined"
        size="small"
        prepend-icon="mdi-refresh"
        :loading="loading"
        @click="loadData"
      >
        Refresh
      </v-btn>
    </div>
    <v-text-field
      v-model="searchQuery"
      class="mb-3"
      density="compact"
      variant="outlined"
      clearable
      hide-details
      prepend-inner-icon="mdi-magnify"
      label="Search visible columns"
    />

    <div class="returning-table-shell">
      <v-table density="compact" class="returning-table">
        <thead>
          <tr>
            <th class="returning-table__select">
              <v-checkbox-btn
                color="primary"
                :model-value="allReturningSelected"
                :indeterminate="someReturningSelected"
                @update:model-value="toggleSelectAll"
              />
            </th>
            <th class="returning-table__expand"></th>
            <th
              v-for="header in returningHeaders"
              :key="header.key"
              class="returning-table__header-cell"
              @click="toggleReturningSort(header.key)"
            >
              <span class="returning-table__sort">
                <span>{{ returningHeaderLabels[header.key] }}</span>
                <v-icon size="14">{{ sortIcon(header.key) }}</v-icon>
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="entry in paginatedReturningGardeners" :key="entry.id">
            <tr
              class="returning-table__row"
              :class="{
                'returning-table__row--selected': isSelected(entry.id),
                'returning-table__row--expanded': isExpanded(entry.id)
              }"
              @click="toggleExpanded(entry.id)"
            >
              <td class="returning-table__select" @click.stop>
                <v-checkbox-btn
                  color="primary"
                  :model-value="isSelected(entry.id)"
                  @update:model-value="toggleSelected(entry.id)"
                />
              </td>
              <td class="returning-table__expand" @click.stop="toggleExpanded(entry.id)">
                <v-btn
                  class="returning-table__expand-btn"
                  icon
                  size="x-small"
                  variant="text"
                  :aria-label="isExpanded(entry.id) ? 'Collapse details' : 'Expand details'"
                >
                  <v-icon size="18">
                    {{ isExpanded(entry.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </v-btn>
              </td>
              <td class="returning-table__cell">{{ entry.firstName }}</td>
              <td class="returning-table__cell">{{ entry.lastName }}</td>
              <td class="returning-table__cell">{{ entry.email }}</td>
              <td class="returning-table__cell">{{ entry.plotSummary }}</td>
              <td class="returning-table__cell">
                <v-chip
                  :color="entry.status === 'complete' ? 'success' : 'grey-darken-1'"
                  size="x-small"
                  variant="flat"
                >
                  {{ entry.status }}
                </v-chip>
              </td>
            </tr>

            <tr v-if="isExpanded(entry.id)" class="returning-table__detail-row">
              <td :colspan="7" class="pa-0">
                <div class="returning-detail">
                  <dl class="returning-detail__list">
                    <template v-for="field in detailRows(entry)" :key="field.label">
                      <dt>{{ field.label }}</dt>
                      <dd>{{ formatValue(field.value) }}</dd>
                    </template>
                  </dl>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loading && paginatedReturningGardeners.length === 0">
            <td colspan="7" class="returning-table__empty">No matching rows.</td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div class="d-flex flex-wrap ga-3 justify-space-between align-center mt-3">
      <div class="text-body-2 text-medium-emphasis">
        {{ selectedReturningGardeners.length }} selected · {{ totalItems }} total
      </div>

      <div class="d-flex flex-wrap ga-3">
        <v-btn
          color="success"
          :loading="actionLoading"
          :disabled="!selectedReturningGardeners.length"
          size="small"
          @click="updateReturningStatus('complete')"
        >
          Mark complete
        </v-btn>
        <v-btn
          color="grey-darken-1"
          variant="outlined"
          :loading="actionLoading"
          :disabled="!selectedReturningGardeners.length"
          size="small"
          @click="updateReturningStatus('incomplete')"
        >
          Mark incomplete
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          :loading="actionLoading"
          :disabled="!selectedReturningGardeners.length"
          size="small"
          @click="deleteSelected"
        >
          Delete
        </v-btn>
        <v-btn color="primary" variant="outlined" size="small" @click="exportReturningGardenersCsv">
          Export to CSV
        </v-btn>
      </div>
    </div>
    <div class="d-flex flex-wrap ga-3 justify-space-between align-center mt-3">
      <v-select
        v-model="pageSize"
        :items="pageSizeOptions"
        label="Rows"
        density="compact"
        variant="outlined"
        hide-details
        class="pagination-size"
      />
      <v-pagination
        v-if="pageSize !== 'all' && totalPages > 1"
        v-model="page"
        :length="totalPages"
        density="comfortable"
      />
    </div>
  </v-card>
</template>

<style scoped>
.returning-card {
  font-size: 0.85rem;
}

.returning-table-shell {
  overflow: hidden;
  background: #fff;
}

.returning-table :deep(th) {
  height: 34px;
  padding: 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(0, 0, 0, 0.62);
  background: transparent !important;
  border: 0;
  border-bottom: 0 !important;
  box-shadow: none;
  text-align: left;
}

.returning-table :deep(thead th) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.16) !important;
}

.returning-table :deep(thead tr) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.16);
}

.returning-table :deep(td) {
  font-size: 0.8rem;
  height: 40px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
}

.returning-table :deep(tbody tr:last-child td) {
  border-bottom: 0;
}

.returning-table__select,
.returning-table__expand {
  width: 30px;
  min-width: 30px;
  text-align: left;
  padding-left: 6px;
  padding-right: 0;
}

.returning-table__header-cell {
  text-align: left;
  padding-left: 6px;
  padding-right: 0;
}

.returning-table__checkbox-label {
  display: inline-flex;
}

.returning-table__sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  appearance: none;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 600;
  color: inherit;
  text-transform: none;
  letter-spacing: 0.01em;
  cursor: pointer;
}

.returning-table__sort:hover {
  opacity: 0.85;
}

.returning-table__row {
  cursor: pointer;
}

.returning-table__row:hover {
  background: rgba(25, 118, 210, 0.03);
}

.returning-table__row--selected {
  background: rgba(25, 118, 210, 0.06);
}

.returning-table__row--expanded {
  background: rgba(25, 118, 210, 0.04);
}

.returning-table__cell {
  text-align: left;
  padding-left: 8px;
}

.returning-table__empty {
  text-align: center;
  color: rgba(0, 0, 0, 0.56);
  padding: 16px 10px !important;
}

.returning-table__expand-btn {
  color: rgba(0, 0, 0, 0.62);
}

.returning-detail {
  padding: 8px 10px 10px;
  margin: 4px 8px 8px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  background: #fff;
}

.returning-detail__list {
  display: grid;
  grid-template-columns: minmax(0, 150px) minmax(0, 1fr);
  gap: 3px 10px;
  margin: 0;
}

.returning-detail__list dt {
  font-size: 0.66rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.55);
  text-align: left;
}

.returning-detail__list dd {
  margin: 0;
  font-size: 0.72rem;
  color: rgba(0, 0, 0, 0.85);
  text-align: left;
}

.pagination-size {
  max-width: 120px;
}

@media (max-width: 700px) {
  .returning-detail__list {
    grid-template-columns: 1fr;
  }
}
</style>
