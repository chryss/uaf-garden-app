<script setup>
import { onMounted, ref, watch } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, remove, set, update } from 'firebase/database';
import { mapHeight, mapWidth } from '@/utils/manualPlotLayout';
import { tablePageSizeOptions, useTablePagination } from '@/composables/useTablePagination';
import { useTableSearchSort } from '@/composables/useTableSearchSort';
import { useTableSelection } from '@/composables/useTableSelection';

const loading = ref(true);
const actionLoading = ref(false);
const rows = ref([]);
const pageSizeOptions = tablePageSizeOptions;
const errorMessage = ref('');
const successMessage = ref('');

const editDialogOpen = ref(false);
const savingEdit = ref(false);
const editingItem = ref(null);
const editErrorMessage = ref('');

const createDialogOpen = ref(false);
const creatingItem = ref(false);
const createErrorMessage = ref('');
const createForm = ref({
  itemKind: 'plot',
  name: '',
  type: 'regular',
  x: '',
  y: '',
  width: '',
  height: ''
});
const plotTypeOptions = ['regular', 'needs work', 'special project'];
const landmarkTypeOptions = ['feature', 'building'];

const headers = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' }
];

const normalizePlotId = (plotId) => {
  const match = /^plot-(\d+)$/i.exec(String(plotId || '').trim());
  if (!match) return String(plotId || '').trim();
  return `plot-${String(Number(match[1])).padStart(3, '0')}`;
};

const isPlotRow = (row) => row.itemKind === 'plot';

const parseDimension = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const validateGeometry = ({ x, y, width, height }) => {
  const parsed = {
    x: parseDimension(x),
    y: parseDimension(y),
    width: parseDimension(width),
    height: parseDimension(height)
  };

  if (
    parsed.x === null
    || parsed.y === null
    || parsed.width === null
    || parsed.height === null
  ) {
    return { error: 'x, y, width, and height must be valid numbers.' };
  }

  if (parsed.width <= 0 || parsed.height <= 0) {
    return { error: 'width and height must be greater than 0.' };
  }

  if (parsed.x < 0 || parsed.x > mapWidth) {
    return { error: `x must be between 0 and ${mapWidth}.` };
  }

  if (parsed.y < 0 || parsed.y > mapHeight) {
    return { error: `y must be between 0 and ${mapHeight}.` };
  }

  return { values: parsed };
};

const slugifyLandmarkName = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const loadData = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [plotsSnapshot, landmarksSnapshot] = await Promise.all([
      get(dbRef(database, 'plots')),
      get(dbRef(database, 'landmarks'))
    ]);

    const plots = plotsSnapshot.exists() ? plotsSnapshot.val() : {};
    const landmarks = landmarksSnapshot.exists() ? landmarksSnapshot.val() : {};

    const plotRows = Object.entries(plots).map(([id, plot]) => ({
      id: normalizePlotId(id),
      itemKind: 'plot',
      name: String(plot?.name ?? ''),
      type: plot?.type || 'regular',
      status: plot?.status || 'available',
      paymentVerified: plot?.paymentVerified === true,
      registeredGardenerId: plot?.registeredGardenerId ?? null,
      x: plot?.x ?? 0,
      y: plot?.y ?? 0,
      width: plot?.width ?? 0,
      height: plot?.height ?? 0
    }));

    const landmarkRows = Object.entries(landmarks).map(([id, landmark]) => ({
      id,
      itemKind: 'landmark',
      name: String(landmark?.name ?? ''),
      type: landmark?.type || 'feature',
      status: '',
      x: landmark?.x ?? 0,
      y: landmark?.y ?? 0,
      width: landmark?.width ?? 0,
      height: landmark?.height ?? 0
    }));

    rows.value = [...plotRows, ...landmarkRows];
    selectedIds.value = [];
  } catch (error) {
    console.error('Error loading plots and landmarks:', error);
    errorMessage.value = 'Unable to load plots and landmarks.';
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
} = useTableSearchSort(rows, {
  defaultSortKey: 'id',
  searchValues: (row) => [
    row.id,
    row.name,
    row.type,
    row.itemKind === 'plot' ? row.status : ''
  ],
  compare: (a, b, key, direction) => {
    if (key === 'id') {
      const aPlot = isPlotRow(a);
      const bPlot = isPlotRow(b);
      if (aPlot && bPlot) {
        const aNum = Number((/^plot-(\d+)$/i.exec(a.id) || [])[1] || Number.MAX_SAFE_INTEGER);
        const bNum = Number((/^plot-(\d+)$/i.exec(b.id) || [])[1] || Number.MAX_SAFE_INTEGER);
        return (aNum - bNum) * direction;
      }
      const aId = String(a.id || '').toLowerCase();
      const bId = String(b.id || '').toLowerCase();
      return aId.localeCompare(bId) * direction;
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
  selectedIds,
  selectedItems: selectedRows,
  allSelected,
  someSelected,
  isSelected,
  toggleSelected,
  toggleSelectAll,
  clearSelection
} = useTableSelection(sortedRows, paginatedRows, (row) => row.id);

const openEditDialog = (row) => {
  editErrorMessage.value = '';
  successMessage.value = '';
  editingItem.value = {
    ...row,
    x: String(row.x ?? ''),
    y: String(row.y ?? ''),
    width: String(row.width ?? ''),
    height: String(row.height ?? '')
  };
  editDialogOpen.value = true;
};

const saveEdit = async () => {
  if (!editingItem.value) return;

  editErrorMessage.value = '';
  successMessage.value = '';
  const geometry = validateGeometry(editingItem.value);
  if (geometry.error) {
    editErrorMessage.value = geometry.error;
    return;
  }

  savingEdit.value = true;
  try {
    if (editingItem.value.itemKind === 'plot') {
      const plotName = String(editingItem.value.name || '').trim();
      const plotNumber = Number(plotName);
      if (!Number.isInteger(plotNumber) || plotNumber <= 0) {
        editErrorMessage.value = 'Plot name must be a positive integer.';
        savingEdit.value = false;
        return;
      }

      const plotType = plotTypeOptions.includes(editingItem.value.type)
        ? editingItem.value.type
        : 'regular';
      await update(dbRef(database, `plots/${editingItem.value.id}`), {
        name: String(plotNumber),
        type: plotType,
        x: geometry.values.x,
        y: geometry.values.y,
        width: geometry.values.width,
        height: geometry.values.height
      });
    } else {
      const landmarkName = String(editingItem.value.name || '').trim();
      if (!landmarkName || landmarkName.length > 50) {
        editErrorMessage.value = 'Landmark name must be between 1 and 50 characters.';
        savingEdit.value = false;
        return;
      }

      await update(dbRef(database, `landmarks/${editingItem.value.id}`), {
        name: landmarkName,
        type: landmarkTypeOptions.includes(editingItem.value.type) ? editingItem.value.type : 'feature',
        x: geometry.values.x,
        y: geometry.values.y,
        width: geometry.values.width,
        height: geometry.values.height
      });
    }

    editDialogOpen.value = false;
    editingItem.value = null;
    successMessage.value = 'Item updated.';
    await loadData();
  } catch (error) {
    console.error('Error saving item:', error);
    editErrorMessage.value = 'Unable to save this item.';
  } finally {
    savingEdit.value = false;
  }
};

const deleteSelected = async () => {
  errorMessage.value = '';
  successMessage.value = '';

  if (!selectedRows.value.length) {
    errorMessage.value = 'Select one or more items first.';
    return;
  }

  const undeletablePlots = selectedRows.value.filter(
    (row) =>
      row.itemKind === 'plot'
      && (row.status !== 'available' || (row.registeredGardenerId !== null && row.registeredGardenerId !== ''))
  );

  const deletableRows = selectedRows.value.filter(
    (row) => !undeletablePlots.find((plot) => plot.id === row.id)
  );

  if (!deletableRows.length) {
    errorMessage.value = 'Selected plots cannot be deleted unless status is "available" and no gardener is associated.';
    return;
  }

  if (!window.confirm(`Delete ${deletableRows.length} selected item(s)? This cannot be undone.`)) {
    return;
  }

  actionLoading.value = true;
  try {
    await Promise.all(
      deletableRows.map((row) =>
        remove(dbRef(database, `${row.itemKind === 'plot' ? 'plots' : 'landmarks'}/${row.id}`))
      )
    );

    if (undeletablePlots.length) {
      errorMessage.value = `${undeletablePlots.length} plot(s) were skipped because they are not available or still have a gardener linked.`;
    } else {
      successMessage.value = 'Selected items deleted.';
    }

    await loadData();
  } catch (error) {
    console.error('Error deleting selected items:', error);
    errorMessage.value = 'Unable to delete selected items.';
  } finally {
    actionLoading.value = false;
  }
};

const openCreateDialog = () => {
  errorMessage.value = '';
  successMessage.value = '';
  createErrorMessage.value = '';
  createForm.value = {
    itemKind: 'plot',
    name: '',
    type: 'regular',
    x: '',
    y: '',
    width: '',
    height: ''
  };
  createDialogOpen.value = true;
};

const createItem = async () => {
  createErrorMessage.value = '';
  successMessage.value = '';
  const geometry = validateGeometry(createForm.value);
  if (geometry.error) {
    createErrorMessage.value = geometry.error;
    return;
  }

  creatingItem.value = true;
  try {
    const [plotsSnapshot, landmarksSnapshot] = await Promise.all([
      get(dbRef(database, 'plots')),
      get(dbRef(database, 'landmarks'))
    ]);
    const plots = plotsSnapshot.exists() ? plotsSnapshot.val() : {};
    const landmarks = landmarksSnapshot.exists() ? landmarksSnapshot.val() : {};

    if (createForm.value.itemKind === 'plot') {
      const plotNumber = Number(createForm.value.name);
      if (!Number.isInteger(plotNumber) || plotNumber <= 0) {
        createErrorMessage.value = 'Plot name must be a positive integer.';
        creatingItem.value = false;
        return;
      }

      const plotId = `plot-${String(plotNumber).padStart(3, '0')}`;
      if (Object.prototype.hasOwnProperty.call(plots, plotId)) {
        createErrorMessage.value = `Plot ${String(plotNumber)} already exists. Name is invalid.`;
        creatingItem.value = false;
        return;
      }
      const plotType = plotTypeOptions.includes(createForm.value.type)
        ? createForm.value.type
        : 'regular';

      await set(dbRef(database, `plots/${plotId}`), {
        name: String(plotNumber),
        type: plotType,
        status: 'available',
        paymentVerified: false,
        registeredGardenerId: null,
        x: geometry.values.x,
        y: geometry.values.y,
        width: geometry.values.width,
        height: geometry.values.height
      });
    } else {
      const landmarkName = String(createForm.value.name || '').trim();
      if (!landmarkName || landmarkName.length > 50) {
        createErrorMessage.value = 'Landmark name must be between 1 and 50 characters.';
        creatingItem.value = false;
        return;
      }

      const landmarkId = slugifyLandmarkName(landmarkName);
      if (!landmarkId) {
        createErrorMessage.value = 'Landmark name is invalid.';
        creatingItem.value = false;
        return;
      }
      if (Object.prototype.hasOwnProperty.call(landmarks, landmarkId)) {
        createErrorMessage.value = `Landmark "${landmarkName}" already exists. Name is invalid.`;
        creatingItem.value = false;
        return;
      }

      await set(dbRef(database, `landmarks/${landmarkId}`), {
        name: landmarkName,
        type: 'feature',
        x: geometry.values.x,
        y: geometry.values.y,
        width: geometry.values.width,
        height: geometry.values.height
      });
    }

    createDialogOpen.value = false;
    successMessage.value = 'Item created.';
    await loadData();
  } catch (error) {
    console.error('Error creating item:', error);
    createErrorMessage.value = 'Unable to create item.';
  } finally {
    creatingItem.value = false;
  }
};

onMounted(loadData);

watch([sortKey, sortDirection, searchQuery], () => {
  resetPage();
  clearSelection();
});
</script>

<template>
  <v-card class="pa-4 rounded-lg elevation-1 returning-card">
    <div class="d-flex flex-wrap justify-space-between align-center ga-3 mb-2">
      <div class="text-body-2 text-medium-emphasis">
        Manage plot and landmark geometry.
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

    <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-3">
      {{ errorMessage }}
    </v-alert>
    <v-alert v-if="successMessage" type="success" variant="tonal" class="mb-3">
      {{ successMessage }}
    </v-alert>

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
            <th
              v-for="header in headers"
              :key="header.key"
              class="returning-table__header-cell"
              @click="toggleSort(header.key)"
            >
              <span class="returning-table__sort">
                <span>{{ header.label }}</span>
                <v-icon size="14">{{ sortIcon(header.key) }}</v-icon>
              </span>
            </th>
            <th class="returning-table__actions">Actions</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="returning-table__empty">Loading…</td>
          </tr>
          <tr v-else-if="paginatedRows.length === 0">
            <td colspan="6" class="returning-table__empty">No items found.</td>
          </tr>
          <tr
            v-for="row in paginatedRows"
            :key="row.id"
            class="returning-table__row"
            :class="{ 'returning-table__row--selected': isSelected(row.id) }"
          >
            <td class="returning-table__select">
              <v-checkbox-btn
                color="primary"
                :model-value="isSelected(row.id)"
                @update:model-value="toggleSelected(row.id)"
              />
            </td>
            <td class="returning-table__cell">{{ row.id }}</td>
            <td class="returning-table__cell">{{ row.name || '—' }}</td>
            <td class="returning-table__cell">{{ row.type || '—' }}</td>
            <td class="returning-table__cell">{{ row.itemKind === 'plot' ? row.status : '—' }}</td>
            <td class="returning-table__actions">
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
        </tbody>
      </v-table>
    </div>

    <div class="d-flex flex-wrap ga-3 justify-space-between align-center mt-3">
      <div class="text-body-2 text-medium-emphasis">
        {{ selectedRows.length }} selected · {{ totalItems }} total
      </div>

      <div class="d-flex flex-wrap ga-3">
        <v-btn
          color="error"
          variant="outlined"
          size="small"
          :loading="actionLoading"
          :disabled="!selectedRows.length"
          @click="deleteSelected"
        >
          Delete selected
        </v-btn>
        <v-btn color="primary" size="small" @click="openCreateDialog">
          Create new...
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

  <v-dialog v-model="editDialogOpen" max-width="620">
    <v-card>
      <v-card-title>Edit {{ editingItem?.itemKind === 'plot' ? 'plot' : 'landmark' }}</v-card-title>
      <v-card-text v-if="editingItem" class="pt-2">
        <v-alert v-if="editErrorMessage" type="error" variant="tonal" class="mb-3">
          {{ editErrorMessage }}
        </v-alert>
        <v-row>
          <v-col cols="12" md="6">
            <div class="readonly-label">ID</div>
            <div class="readonly-value">{{ editingItem.id }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-if="editingItem.itemKind === 'plot'"
              v-model="editingItem.name"
              label="Name"
            />
            <v-text-field
              v-else
              v-model="editingItem.name"
              label="Name"
              maxlength="50"
              counter
            />
          </v-col>
          <v-col cols="12" md="6" v-if="editingItem.itemKind === 'plot'">
            <div class="readonly-label">Status</div>
            <div class="readonly-value">{{ editingItem.status }}</div>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-if="editingItem.itemKind === 'plot'"
              v-model="editingItem.type"
              :items="plotTypeOptions"
              label="Type"
            />
            <v-select
              v-else
              v-model="editingItem.type"
              :items="landmarkTypeOptions"
              label="Type"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="editingItem.x"
              label="x"
              type="number"
              :hint="`Canvas x range: 0 to ${mapWidth}`"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="editingItem.y"
              label="y"
              type="number"
              :hint="`Canvas y range: 0 to ${mapHeight}`"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="editingItem.width"
              label="width"
              type="number"
              hint="Pixels"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="editingItem.height"
              label="height"
              type="number"
              hint="Pixels"
              persistent-hint
            />
          </v-col>
        </v-row>
        <div v-if="editingItem.itemKind === 'plot'" class="text-caption text-medium-emphasis mt-2">
          Please edit plot status, assignment and payment verification in the Plot reservations dashboard.
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="editDialogOpen = false">Cancel</v-btn>
        <v-btn color="primary" :loading="savingEdit" @click="saveEdit">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="createDialogOpen" max-width="620">
    <v-card>
      <v-card-title>Create new item</v-card-title>
      <v-card-text class="pt-2">
        <v-alert v-if="createErrorMessage" type="error" variant="tonal" class="mb-3">
          {{ createErrorMessage }}
        </v-alert>
        <v-row>
          <v-col cols="12">
            <v-radio-group v-model="createForm.itemKind" inline label="Item type">
              <v-radio label="Plot" value="plot" />
              <v-radio label="Landmark" value="landmark" />
            </v-radio-group>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="createForm.name"
              :label="createForm.itemKind === 'plot' ? 'Name (integer)' : 'Name (max 50 chars)'"
              :maxlength="createForm.itemKind === 'landmark' ? 50 : undefined"
            />
          </v-col>
          <v-col cols="12" md="6" v-if="createForm.itemKind === 'plot'">
            <v-select
              v-model="createForm.type"
              :items="plotTypeOptions"
              label="Type"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="createForm.x"
              label="x"
              type="number"
              :hint="`Canvas x range: 0 to ${mapWidth}`"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="createForm.y"
              label="y"
              type="number"
              :hint="`Canvas y range: 0 to ${mapHeight}`"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="createForm.width"
              label="width"
              type="number"
              hint="Pixels"
              persistent-hint
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="createForm.height"
              label="height"
              type="number"
              hint="Pixels"
              persistent-hint
            />
          </v-col>
        </v-row>
        <div class="text-caption text-medium-emphasis mt-2">
          New plots are created with status <strong>available</strong>. New landmarks are created as type <strong>feature</strong>.
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="createDialogOpen = false">Cancel</v-btn>
        <v-btn color="primary" :loading="creatingItem" @click="createItem">Create</v-btn>
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

.returning-table__select {
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
  cursor: pointer;
}

.returning-table__row:hover {
  background: rgba(25, 118, 210, 0.03);
}

.returning-table__row--selected td {
  background: rgba(25, 118, 210, 0.08) !important;
}

.returning-table__cell {
  text-align: left;
  padding-left: 6px;
}

.returning-table__actions {
  width: 100px;
  text-align: right;
  padding-right: 10px;
}

.returning-table__empty {
  text-align: center;
  color: rgba(0, 0, 0, 0.56);
  padding: 18px 10px !important;
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

.pagination-size {
  max-width: 120px;
}
</style>
