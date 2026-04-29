<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ref as dbRef, get, remove, update } from 'firebase/database';
import { database } from '@/services/firebaseConfig';

const loading = ref(true);
const actionLoading = ref(false);
const registrationRows = ref([]);
const gardenersById = ref({});

const selectedRowIds = ref([]);
const expandedRowIds = ref([]);

const sortKey = ref('plotNumber');
const sortDirection = ref('asc');
const searchQuery = ref('');
const page = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [
  { title: '15', value: 15 },
  { title: '30', value: 30 },
  { title: '45', value: 45 },
  { title: 'All', value: 'all' }
];

const headers = [
  { title: 'Plot ID', key: 'plotNumber' },
  { title: 'First Name', key: 'firstName' },
  { title: 'Last Name', key: 'lastName' },
  { title: 'Email', key: 'email' },
  { title: 'Affiliation', key: 'affiliationLabel' },
  { title: 'Partners', key: 'partnersSummary' },
  { title: 'Paid', key: 'paymentLabel' }
];

const headerLabels = {
  plotNumber: 'Plot ID',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  affiliationLabel: 'Affiliation',
  partnersSummary: 'Partners',
  paymentLabel: 'Paid'
};

const normalizePlotId = (plotId) => {
  if (!plotId) return '';
  const match = /^plot-(\d+)$/i.exec(String(plotId).trim());
  if (!match) return String(plotId).trim();
  return `plot-${String(Number(match[1])).padStart(3, '0')}`;
};

const getPlotNumber = (plotId) => {
  const normalized = normalizePlotId(plotId);
  const match = /^plot-(\d+)$/i.exec(normalized);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const formatPlotLabel = (plotId) => {
  const number = getPlotNumber(plotId);
  if (!Number.isFinite(number) || number === Number.MAX_SAFE_INTEGER) {
    return plotId || '—';
  }
  return String(number).padStart(3, '0');
};

const formatPartners = (partners) => {
  const entries = Array.isArray(partners) ? partners : [];
  if (!entries.length) return '—';
  const values = entries
    .map((partner) => [partner?.name, partner?.email].filter(Boolean).join(' ').trim())
    .filter(Boolean);
  return values.length ? values.join('; ') : '—';
};

const formatAffiliation = (gardener) => {
  if (Array.isArray(gardener?.affiliations) && gardener.affiliations.length) {
    return gardener.affiliations.join(', ');
  }
  return gardener?.affiliation || '—';
};

const loadData = async () => {
  loading.value = true;

  try {
    const [plotsSnapshot, gardenersSnapshot] = await Promise.all([
      get(dbRef(database, 'plots')),
      get(dbRef(database, 'gardeners'))
    ]);

    const plotsById = plotsSnapshot.exists() ? plotsSnapshot.val() : {};
    const gardeners = gardenersSnapshot.exists() ? gardenersSnapshot.val() : {};
    gardenersById.value = gardeners;

    const rows = [];

    Object.entries(gardeners).forEach(([gardenerId, gardener]) => {
      const plotIds = [
        gardener.plotId,
        ...(Array.isArray(gardener.plots) ? gardener.plots : [])
      ]
        .filter(Boolean)
        .map(normalizePlotId)
        .filter((value, index, arr) => arr.indexOf(value) === index);

      plotIds.forEach((plotId) => {
        const plot = plotsById[plotId] || {};
        const rowId = `${gardenerId}::${plotId}`;
        const paid = gardener.paymentVerified ?? plot.paymentVerified ?? false;

        rows.push({
          id: rowId,
          gardenerId,
          plotId,
          plotNumber: getPlotNumber(plotId),
          plotLabel: formatPlotLabel(plotId),
          firstName: gardener.firstName || '',
          lastName: gardener.lastName || '',
          email: gardener.email || '',
          affiliationLabel: formatAffiliation(gardener),
          partnersSummary: formatPartners(gardener.partners),
          paymentVerified: paid === true,
          paymentLabel: paid ? 'Yes' : 'No',
          gardenerRaw: gardener,
          plotRaw: plot
        });
      });
    });

    registrationRows.value = rows;
  } catch (error) {
    console.error('Error loading plot reservations:', error);
  } finally {
    loading.value = false;
  }
};

const filteredRows = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return registrationRows.value;

  return registrationRows.value.filter((row) =>
    [
      row.plotLabel,
      row.firstName,
      row.lastName,
      row.email,
      row.affiliationLabel,
      row.partnersSummary,
      row.paymentLabel
    ].some((value) => String(value ?? '').toLowerCase().includes(query))
  );
});

const sortedRows = computed(() => {
  const rows = [...filteredRows.value];
  const key = sortKey.value;
  const direction = sortDirection.value === 'asc' ? 1 : -1;

  rows.sort((a, b) => {
    if (key === 'plotNumber') {
      return (a.plotNumber - b.plotNumber) * direction;
    }

    if (key === 'paymentLabel') {
      return (Number(a.paymentVerified) - Number(b.paymentVerified)) * direction;
    }

    const aValue = String(a[key] ?? '').toLowerCase();
    const bValue = String(b[key] ?? '').toLowerCase();
    return aValue.localeCompare(bValue) * direction;
  });

  return rows;
});

const totalItems = computed(() => sortedRows.value.length);
const totalPages = computed(() => {
  if (pageSize.value === 'all') return 1;
  return Math.max(1, Math.ceil(totalItems.value / Number(pageSize.value)));
});

const paginatedRows = computed(() => {
  if (pageSize.value === 'all') return sortedRows.value;
  const start = (page.value - 1) * Number(pageSize.value);
  return sortedRows.value.slice(start, start + Number(pageSize.value));
});

const selectedRows = computed(() =>
  sortedRows.value.filter((row) => selectedRowIds.value.includes(row.id))
);

const allSelected = computed(
  () => paginatedRows.value.length > 0
    && paginatedRows.value.every((row) => selectedRowIds.value.includes(row.id))
);

const someSelected = computed(
  () => paginatedRows.value.some((row) => selectedRowIds.value.includes(row.id)) && !allSelected.value
);

const isSelected = (id) => selectedRowIds.value.includes(id);

const toggleSelected = (id) => {
  if (isSelected(id)) {
    selectedRowIds.value = selectedRowIds.value.filter((value) => value !== id);
    return;
  }
  selectedRowIds.value = [...selectedRowIds.value, id];
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    const pageRowIds = new Set(paginatedRows.value.map((row) => row.id));
    selectedRowIds.value = selectedRowIds.value.filter((id) => !pageRowIds.has(id));
    return;
  }
  const merged = new Set([...selectedRowIds.value, ...paginatedRows.value.map((row) => row.id)]);
  selectedRowIds.value = [...merged];
};

const isExpanded = (id) => expandedRowIds.value.includes(id);

const toggleExpanded = (id) => {
  if (isExpanded(id)) {
    expandedRowIds.value = expandedRowIds.value.filter((value) => value !== id);
    return;
  }
  expandedRowIds.value = [id];
};

const toggleSort = (key) => {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  sortKey.value = key;
  sortDirection.value = 'asc';
};

const sortIcon = (key) => {
  if (sortKey.value !== key) {
    return 'mdi-swap-vertical';
  }
  return sortDirection.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
};

const formatFieldValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const detailRows = (row) => {
  const gardenerFields = Object.entries(row.gardenerRaw || {}).map(([key, value]) => ({
    label: `gardener.${key}`,
    value
  }));
  const plotFields = Object.entries(row.plotRaw || {}).map(([key, value]) => ({
    label: `plot.${key}`,
    value
  }));
  return [...gardenerFields, ...plotFields];
};

const updateSelectionVerification = async ({ gardenerPaid, plotStatus, plotPaid }) => {
  if (!selectedRows.value.length) {
    window.alert('Select one or more reservations first.');
    return;
  }

  actionLoading.value = true;

  try {
    const updatedAt = new Date().toISOString();
    const uniqueGardenerIds = [...new Set(selectedRows.value.map((row) => row.gardenerId))];

    await Promise.all([
      ...uniqueGardenerIds.map((gardenerId) =>
        update(dbRef(database, `gardeners/${gardenerId}`), {
          paymentVerified: gardenerPaid,
          updatedAt
        })
      ),
      ...selectedRows.value.map((row) =>
        update(dbRef(database, `plots/${row.plotId}`), {
          status: plotStatus,
          paymentVerified: plotPaid,
          registeredGardenerId: row.gardenerId
        })
      )
    ]);

    selectedRowIds.value = [];
    expandedRowIds.value = [];
    await loadData();
  } catch (error) {
    console.error('Error updating selected reservations:', error);
    window.alert('Unable to update selected reservations.');
  } finally {
    actionLoading.value = false;
  }
};

const markVerified = async () =>
  updateSelectionVerification({
    gardenerPaid: true,
    plotStatus: 'verified',
    plotPaid: true
  });

const markNotVerified = async () =>
  updateSelectionVerification({
    gardenerPaid: false,
    plotStatus: 'reserved',
    plotPaid: false
  });

const deleteSelected = async () => {
  if (!selectedRows.value.length) {
    window.alert('Select one or more reservations first.');
    return;
  }

  if (!window.confirm('Delete selected reservations? This cannot be undone.')) {
    return;
  }

  actionLoading.value = true;

  try {
    const rowsByGardener = new Map();
    selectedRows.value.forEach((row) => {
      const existing = rowsByGardener.get(row.gardenerId) || [];
      existing.push(row.plotId);
      rowsByGardener.set(row.gardenerId, existing);
    });

    const gardenerUpdates = [];
    rowsByGardener.forEach((selectedPlotIds, gardenerId) => {
      const gardener = gardenersById.value[gardenerId];
      if (!gardener) return;

      const originalPlotIds = [
        gardener.plotId,
        ...(Array.isArray(gardener.plots) ? gardener.plots : [])
      ]
        .filter(Boolean)
        .map(normalizePlotId)
        .filter((value, index, arr) => arr.indexOf(value) === index);

      const selectedSet = new Set(selectedPlotIds.map(normalizePlotId));
      const remainingPlotIds = originalPlotIds.filter((plotId) => !selectedSet.has(plotId));

      if (!remainingPlotIds.length) {
        gardenerUpdates.push(remove(dbRef(database, `gardeners/${gardenerId}`)));
      } else {
        gardenerUpdates.push(
          update(dbRef(database, `gardeners/${gardenerId}`), {
            plotId: remainingPlotIds[0],
            plots: remainingPlotIds,
            updatedAt: new Date().toISOString()
          })
        );
      }
    });

    const plotUpdates = selectedRows.value.map((row) =>
      update(dbRef(database, `plots/${row.plotId}`), {
        status: 'available',
        paymentVerified: false,
        registeredGardenerId: null
      })
    );

    await Promise.all([...gardenerUpdates, ...plotUpdates]);

    selectedRowIds.value = [];
    expandedRowIds.value = [];
    await loadData();
  } catch (error) {
    console.error('Error deleting selected reservations:', error);
    window.alert('Unable to delete selected reservations.');
  } finally {
    actionLoading.value = false;
  }
};

const exportCsv = () => {
  const columns = [
    'plotId',
    'plotNumber',
    'gardenerId',
    'firstName',
    'lastName',
    'email',
    'affiliation',
    'partners',
    'paid'
  ];

  const rows = sortedRows.value.map((row) => ({
    plotId: row.plotId,
    plotNumber: row.plotLabel,
    gardenerId: row.gardenerId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    affiliation: row.affiliationLabel,
    partners: row.partnersSummary,
    paid: row.paymentVerified ? 'Yes' : 'No'
  }));

  const escapeValue = (value) =>
    `"${String(value ?? '').replaceAll('"', '""').replaceAll('\n', ' ').replaceAll('\r', ' ')}"`;

  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeValue(row[column])).join(','))
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.href = url;
  link.download = `plot_reservations-${timestamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

watch([sortKey, sortDirection, searchQuery], () => {
  selectedRowIds.value = [];
  expandedRowIds.value = [];
  page.value = 1;
});

watch(pageSize, () => {
  page.value = 1;
});

onMounted(loadData);
</script>

<template>
  <v-card class="pa-4 rounded-lg elevation-1 returning-card">
    <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-2">
      <div class="text-body-2 text-medium-emphasis">
        Manage gardener registrations for the current season.
      </div>
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
                :model-value="allSelected"
                :indeterminate="someSelected"
                @update:model-value="toggleSelectAll"
              />
            </th>
            <th class="returning-table__expand"></th>
            <th
              v-for="header in headers"
              :key="header.key"
              class="returning-table__header-cell"
              @click="toggleSort(header.key)"
            >
              <span class="returning-table__sort">
                <span>{{ headerLabels[header.key] }}</span>
                <v-icon size="14">{{ sortIcon(header.key) }}</v-icon>
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-for="row in paginatedRows" :key="row.id">
            <tr
              class="returning-table__row"
              :class="{
                'returning-table__row--selected': isSelected(row.id),
                'returning-table__row--expanded': isExpanded(row.id)
              }"
              @click="toggleExpanded(row.id)"
            >
              <td class="returning-table__select" @click.stop>
                <v-checkbox-btn
                  color="primary"
                  :model-value="isSelected(row.id)"
                  @update:model-value="toggleSelected(row.id)"
                />
              </td>
              <td class="returning-table__expand" @click.stop="toggleExpanded(row.id)">
                <v-btn
                  class="returning-table__expand-btn"
                  icon
                  size="x-small"
                  variant="text"
                  :aria-label="isExpanded(row.id) ? 'Collapse details' : 'Expand details'"
                >
                  <v-icon size="18">
                    {{ isExpanded(row.id) ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
                  </v-icon>
                </v-btn>
              </td>
              <td class="returning-table__cell">{{ row.plotLabel }}</td>
              <td class="returning-table__cell">{{ row.firstName || '—' }}</td>
              <td class="returning-table__cell">{{ row.lastName || '—' }}</td>
              <td class="returning-table__cell">{{ row.email || '—' }}</td>
              <td class="returning-table__cell">{{ row.affiliationLabel }}</td>
              <td class="returning-table__cell">{{ row.partnersSummary }}</td>
              <td class="returning-table__cell">
                <v-chip
                  :color="row.paymentVerified ? 'success' : 'grey-darken-1'"
                  size="x-small"
                  variant="flat"
                >
                  {{ row.paymentVerified ? 'Yes' : 'No' }}
                </v-chip>
              </td>
            </tr>

            <tr v-if="isExpanded(row.id)" class="returning-table__detail-row">
              <td :colspan="9" class="pa-0">
                <div class="returning-detail">
                  <dl class="returning-detail__list">
                    <template v-for="field in detailRows(row)" :key="field.label">
                      <dt>{{ field.label }}</dt>
                      <dd>{{ formatFieldValue(field.value) }}</dd>
                    </template>
                  </dl>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!loading && paginatedRows.length === 0">
            <td :colspan="9" class="returning-table__empty">No matching rows.</td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div class="d-flex flex-wrap ga-3 justify-space-between align-center mt-3">
      <div class="text-body-2 text-medium-emphasis">
        {{ selectedRows.length }} selected · {{ totalItems }} total
      </div>

      <div class="d-flex flex-wrap ga-3">
        <v-btn
          color="success"
          :loading="actionLoading"
          :disabled="!selectedRows.length"
          size="small"
          @click="markVerified"
        >
          Mark verified
        </v-btn>
        <v-btn
          color="grey-darken-1"
          variant="outlined"
          :loading="actionLoading"
          :disabled="!selectedRows.length"
          size="small"
          @click="markNotVerified"
        >
          Mark not verified
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          :loading="actionLoading"
          :disabled="!selectedRows.length"
          size="small"
          @click="deleteSelected"
        >
          Delete
        </v-btn>
        <v-btn color="primary" variant="outlined" size="small" @click="exportCsv">
          Export CSV
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

.returning-table__row:hover {
  background: rgba(25, 118, 210, 0.03);
}

.returning-table__row--selected td {
  background: rgba(25, 118, 210, 0.08) !important;
}

.returning-table__row--expanded td {
  border-bottom-color: rgba(25, 118, 210, 0.18);
}

.returning-table__cell {
  text-align: left;
  padding-left: 6px;
}

.returning-table__expand-btn {
  min-width: 20px;
  width: 20px;
  height: 20px;
  color: rgba(0, 0, 0, 0.54);
}

.returning-table__empty {
  text-align: center;
  color: rgba(0, 0, 0, 0.56);
  padding: 16px 10px !important;
}

.returning-detail {
  border-top: 1px solid rgba(25, 118, 210, 0.15);
  background: rgba(25, 118, 210, 0.04);
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

@media (max-width: 960px) {
  .returning-detail__list {
    grid-template-columns: 1fr;
  }
}
</style>
