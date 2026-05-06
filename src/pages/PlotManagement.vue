<script setup>
import { onMounted, ref, watch } from 'vue';
import { ref as dbRef, get, remove, update } from 'firebase/database';
import { database } from '@/services/firebaseConfig';
import UafAffiliationSelector from '@/components/UafAffiliationSelector.vue';
import { tablePageSizeOptions, useTablePagination } from '@/composables/useTablePagination';
import { useTableSearchSort } from '@/composables/useTableSearchSort';
import { useTableSelection } from '@/composables/useTableSelection';

const loading = ref(true);
const actionLoading = ref(false);
const registrationRows = ref([]);
const gardenersById = ref({});

const expandedRowIds = ref([]);
const pageSizeOptions = tablePageSizeOptions;
const editDialogOpen = ref(false);
const savingEdit = ref(false);
const editErrorMessage = ref('');
const editingReservation = ref(null);

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

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const makeGardenerIdFromEmail = (email) => {
  const safeEmail = normalizeEmail(email)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `gardener-${safeEmail || 'unknown'}`;
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

const getAffiliations = (gardener) => {
  if (Array.isArray(gardener?.affiliations) && gardener.affiliations.length) {
    return gardener.affiliations.filter(Boolean);
  }
  return gardener?.affiliation ? [gardener.affiliation] : [];
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
          affiliations: getAffiliations(gardener),
          studentType: gardener.studentType || '',
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

const {
  sortKey,
  sortDirection,
  searchQuery,
  sortedItems: sortedRows,
  toggleSort,
  sortIcon
} = useTableSearchSort(registrationRows, {
  defaultSortKey: 'plotNumber',
  searchValues: (row) => [
    row.plotLabel,
    row.firstName,
    row.lastName,
    row.email,
    row.affiliationLabel,
    row.partnersSummary,
    row.paymentLabel
  ],
  compare: (a, b, key, direction) => {
    if (key === 'plotNumber') {
      return (a.plotNumber - b.plotNumber) * direction;
    }
    if (key === 'paymentLabel') {
      return (Number(a.paymentVerified) - Number(b.paymentVerified)) * direction;
    }
    const aValue = String(a[key] ?? '').toLowerCase();
    const bValue = String(b[key] ?? '').toLowerCase();
    return aValue.localeCompare(bValue) * direction;
  }
});
const {
  page,
  pageSize,
  totalItems,
  totalPages,
  paginatedItems: paginatedRows,
  resetPage
} = useTablePagination(sortedRows);
const {
  selectedIds: selectedRowIds,
  selectedItems: selectedRows,
  allSelected,
  someSelected,
  isSelected,
  toggleSelected,
  toggleSelectAll,
  clearSelection
} = useTableSelection(sortedRows, paginatedRows, (row) => row.id);

const isExpanded = (id) => expandedRowIds.value.includes(id);

const toggleExpanded = (id) => {
  if (isExpanded(id)) {
    expandedRowIds.value = expandedRowIds.value.filter((value) => value !== id);
    return;
  }
  expandedRowIds.value = [id];
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

const openEditDialog = (row) => {
  editErrorMessage.value = '';
  editingReservation.value = {
    rowId: row.id,
    gardenerId: row.gardenerId,
    plotId: row.plotId,
    firstName: row.firstName || '',
    lastName: row.lastName || '',
    email: row.email || '',
    affiliations: [...(row.affiliations || [])],
    studentType: row.studentType || '',
    paymentVerified: row.paymentVerified === true,
    editPartners: false,
    partners: normalizePartners(row.gardenerRaw?.partners)
  };
  editDialogOpen.value = true;
};

const getGardenerIdsByEmail = (email) => {
  const normalized = normalizeEmail(email);
  return Object.entries(gardenersById.value)
    .filter(([, gardener]) => normalizeEmail(gardener?.email) === normalized)
    .map(([gardenerId]) => gardenerId);
};

const getGardenerPlotIds = (gardener) =>
  [
    gardener?.plotId,
    ...(Array.isArray(gardener?.plots) ? gardener.plots : [])
  ]
    .filter(Boolean)
    .map(normalizePlotId)
    .filter((value, index, arr) => arr.indexOf(value) === index);

const normalizePartners = (partners) =>
  (Array.isArray(partners) ? partners : [])
    .map((partner) => ({
      name: String(partner?.name || '').trim(),
      email: String(partner?.email || '').trim()
    }))
    .filter((partner) => partner.name || partner.email);

const addEditPartner = () => {
  if (!editingReservation.value) return;
  editingReservation.value.partners.push({ name: '', email: '' });
};

const removeEditPartner = (index) => {
  if (!editingReservation.value) return;
  editingReservation.value.partners.splice(index, 1);
};

const saveReservationEdit = async () => {
  if (!editingReservation.value) {
    return;
  }

  editErrorMessage.value = '';
  const payload = editingReservation.value;
  const firstName = String(payload.firstName || '').trim();
  const lastName = String(payload.lastName || '').trim();
  const email = normalizeEmail(payload.email);
  const affiliations = Array.isArray(payload.affiliations)
    ? payload.affiliations.filter(Boolean)
    : [];
  const studentType = affiliations.includes('Student') ? String(payload.studentType || '') : '';
  const partners = normalizePartners(payload.partners);

  if (!firstName || !lastName || !email) {
    editErrorMessage.value = 'First name, last name, and email are required.';
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    editErrorMessage.value = 'Enter a valid email address.';
    return;
  }

  if (!affiliations.length) {
    editErrorMessage.value = 'Select at least one affiliation.';
    return;
  }

  if (affiliations.includes('Student') && !studentType) {
    editErrorMessage.value = 'Select a student type when Student affiliation is selected.';
    return;
  }

  const sourceRow = registrationRows.value.find((row) => row.id === payload.rowId);
  if (!sourceRow) {
    editErrorMessage.value = 'Unable to locate this reservation.';
    return;
  }

  const oldEmail = normalizeEmail(sourceRow.email);
  const firstChanged = firstName !== (sourceRow.firstName || '');
  const lastChanged = lastName !== (sourceRow.lastName || '');
  const emailChanged = email !== oldEmail;

  const relatedGardenerIds = getGardenerIdsByEmail(oldEmail);
  let gardenerIdsToUpdate = [payload.gardenerId];

  if (emailChanged && relatedGardenerIds.length > 1) {
    const applyToAll = window.confirm(
      'Other registrations use this same email. Apply the email change to those registrations too?'
    );
    if (applyToAll) {
      gardenerIdsToUpdate = relatedGardenerIds;
    }
  } else if ((firstChanged || lastChanged) && relatedGardenerIds.length > 1) {
    const applyNamesToAll = window.confirm(
      'Warning: this email has multiple registrations. Apply this name change to all registrations with the same email?'
    );
    if (applyNamesToAll) {
      gardenerIdsToUpdate = relatedGardenerIds;
    }
  }

  const updatedAt = new Date().toISOString();
  const gardenerPatch = {
    firstName,
    lastName,
    email,
    affiliations,
    affiliation: affiliations[0] || null,
    studentType: affiliations.includes('Student') ? studentType : null,
    ...(payload.editPartners ? { partners } : {}),
    updatedAt
  };

  savingEdit.value = true;
  try {
    if (emailChanged) {
      const targetGardenerId = makeGardenerIdFromEmail(email);
      const targetExisting = gardenersById.value[targetGardenerId] || null;
      const sourceGardeners = gardenerIdsToUpdate
        .map((gardenerId) => gardenersById.value[gardenerId])
        .filter(Boolean);
      const sourcePlotIds = sourceGardeners.flatMap((gardener) => getGardenerPlotIds(gardener));
      const targetPlotIds = getGardenerPlotIds(targetExisting);
      const mergedPlotIds = [...new Set([...targetPlotIds, ...sourcePlotIds])];
      const mergedPartners = [
        ...(Array.isArray(targetExisting?.partners) ? targetExisting.partners : []),
        ...sourceGardeners.flatMap((gardener) => (Array.isArray(gardener?.partners) ? gardener.partners : []))
      ];

      await update(dbRef(database, `gardeners/${targetGardenerId}`), {
        ...(targetExisting || {}),
        ...gardenerPatch,
        plotId: mergedPlotIds[0] || payload.plotId,
        plots: mergedPlotIds.length ? mergedPlotIds : [payload.plotId],
        partners: payload.editPartners ? partners : mergedPartners,
        paymentVerified: payload.paymentVerified === true,
        agreeRules: targetExisting?.agreeRules === true || sourceGardeners.some((gardener) => gardener?.agreeRules === true),
        agreeWaiver: targetExisting?.agreeWaiver === true || sourceGardeners.some((gardener) => gardener?.agreeWaiver === true),
        createdAt: targetExisting?.createdAt || sourceGardeners[0]?.createdAt || updatedAt,
        updatedAt
      });

      const oldIdsToRemove = gardenerIdsToUpdate.filter((gardenerId) => gardenerId !== targetGardenerId);
      await Promise.all(oldIdsToRemove.map((gardenerId) => remove(dbRef(database, `gardeners/${gardenerId}`))));

      await Promise.all(
        (mergedPlotIds.length ? mergedPlotIds : [payload.plotId]).map((plotId) =>
          update(dbRef(database, `plots/${plotId}`), {
            registeredGardenerId: targetGardenerId
          })
        )
      );

      await update(dbRef(database, `plots/${payload.plotId}`), {
        paymentVerified: payload.paymentVerified === true,
        status: payload.paymentVerified ? 'verified' : 'reserved',
        registeredGardenerId: targetGardenerId
      });
    } else {
      await Promise.all([
        ...gardenerIdsToUpdate.map((gardenerId) =>
          update(dbRef(database, `gardeners/${gardenerId}`), gardenerPatch)
        ),
        update(dbRef(database, `plots/${payload.plotId}`), {
          paymentVerified: payload.paymentVerified === true,
          status: payload.paymentVerified ? 'verified' : 'reserved',
          registeredGardenerId: payload.gardenerId
        }),
        update(dbRef(database, `gardeners/${payload.gardenerId}`), {
          paymentVerified: payload.paymentVerified === true,
          updatedAt
        })
      ]);
    }

    editDialogOpen.value = false;
    editingReservation.value = null;
    await loadData();
  } catch (error) {
    console.error('Error saving reservation:', error);
    editErrorMessage.value = 'Unable to save reservation changes.';
  } finally {
    savingEdit.value = false;
  }
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

    clearSelection();
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

    clearSelection();
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
  const gardenerFields = [...new Set(sortedRows.value.flatMap((row) => Object.keys(row.gardenerRaw || {})))];
  const plotFields = [...new Set(sortedRows.value.flatMap((row) => Object.keys(row.plotRaw || {})))];
  const columns = [
    'rowId',
    'gardenerId',
    'plotId',
    'plotNumber',
    ...gardenerFields.map((field) => `gardener.${field}`),
    ...plotFields.map((field) => `plot.${field}`)
  ];

  const rows = sortedRows.value.map((row) => {
    const result = {
      rowId: row.id,
      gardenerId: row.gardenerId,
      plotId: row.plotId,
      plotNumber: row.plotLabel
    };

    gardenerFields.forEach((field) => {
      const value = row.gardenerRaw?.[field];
      result[`gardener.${field}`] =
        Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : value;
    });

    plotFields.forEach((field) => {
      const value = row.plotRaw?.[field];
      result[`plot.${field}`] =
        Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : value;
    });

    return result;
  });

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
  clearSelection();
  expandedRowIds.value = [];
  resetPage();
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
            <th class="returning-table__actions">Actions</th>
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
              <td class="returning-table__actions" @click.stop>
                <v-btn
                  size="small"
                  variant="flat"
                  rounded="lg"
                  class="edit-btn"
                  @click="openEditDialog(row)"
                >
                  Edit
                </v-btn>
              </td>
            </tr>

            <tr v-if="isExpanded(row.id)" class="returning-table__detail-row">
              <td :colspan="10" class="pa-0">
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
            <td :colspan="10" class="returning-table__empty">No matching rows.</td>
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

  <v-dialog v-model="editDialogOpen" max-width="680">
    <v-card>
      <v-card-title>Edit reservation</v-card-title>
      <v-card-text v-if="editingReservation" class="pt-2">
        <v-alert v-if="editErrorMessage" type="error" variant="tonal" class="mb-3">
          {{ editErrorMessage }}
        </v-alert>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field v-model="editingReservation.firstName" label="First name" />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field v-model="editingReservation.lastName" label="Last name" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="editingReservation.email" label="Email" type="email" />
          </v-col>
        </v-row>
        <UafAffiliationSelector
          v-model="editingReservation.affiliations"
          v-model:student-type="editingReservation.studentType"
        />
        <v-row>
          <v-col cols="12" md="6">
            <v-switch
              v-model="editingReservation.paymentVerified"
              color="success"
              inset
              label="Verified payment"
            />
          </v-col>
          <v-col cols="12" md="6">
            <div class="readonly-label">Plot</div>
            <div class="readonly-value">{{ editingReservation.plotId }}</div>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <v-switch
              v-model="editingReservation.editPartners"
              color="primary"
              inset
              label="Edit partners"
            />
          </v-col>
        </v-row>
        <div v-if="editingReservation.editPartners" class="partners-editor">
          <div
            v-for="(partner, index) in editingReservation.partners"
            :key="`partner-${index}`"
            class="partners-editor__row"
          >
            <v-text-field
              v-model="partner.name"
              label="Partner name"
              density="compact"
              class="partners-editor__field"
            />
            <v-text-field
              v-model="partner.email"
              label="Partner email"
              type="email"
              density="compact"
              class="partners-editor__field"
            />
            <v-btn
              icon="mdi-close"
              variant="text"
              size="small"
              color="error"
              @click="removeEditPartner(index)"
            />
          </div>
          <v-btn
            size="small"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            @click="addEditPartner"
          >
            Add partner
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="editDialogOpen = false">Cancel</v-btn>
        <v-btn color="primary" :loading="savingEdit" @click="saveReservationEdit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.returning-card {
  font-size: 0.85rem;
}

.returning-table-shell {
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.returning-table :deep(th) {
  height: 34px;
  padding: 0 6px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface), 0.62);
  background: transparent !important;
  border: 0;
  border-bottom: 0 !important;
  box-shadow: none;
  text-align: left;
}

.returning-table :deep(thead th) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16) !important;
}

.returning-table :deep(thead tr) {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.16);
}

.returning-table :deep(td) {
  font-size: 0.8rem;
  height: 40px;
  color: rgb(var(--v-theme-on-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
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
  color: rgba(var(--v-theme-on-surface), 0.54);
}

.returning-table__actions {
  width: 102px;
  min-width: 102px;
  text-align: right;
  padding-right: 8px;
}

.edit-btn {
  text-transform: none;
  min-width: 72px;
  background-color: #5f7ea6 !important;
  color: #fff !important;
}

.edit-btn:hover {
  background-color: #547095 !important;
}

.returning-table__empty {
  text-align: center;
  color: rgba(var(--v-theme-on-surface), 0.56);
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

.readonly-label {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.62);
  margin-bottom: 4px;
}

.readonly-value {
  min-height: 40px;
  border: 1px solid rgba(0, 0, 0, 0.23);
  border-radius: 4px;
  background: #fff;
  padding: 9px 12px;
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.87);
}

.partners-editor {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  padding: 10px;
  margin-top: 8px;
}

.partners-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.partners-editor__field {
  margin-bottom: 2px;
}

@media (max-width: 960px) {
  .returning-detail__list {
    grid-template-columns: 1fr;
  }
}
</style>
