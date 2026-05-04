import { computed, ref } from 'vue';

export const useTableSelection = (allItemsRef, pageItemsRef, getId = (item) => item.id) => {
  const selectedIds = ref([]);

  const selectedItems = computed(() =>
    allItemsRef.value.filter((item) => selectedIds.value.includes(getId(item)))
  );

  const allSelected = computed(
    () => pageItemsRef.value.length > 0
      && pageItemsRef.value.every((item) => selectedIds.value.includes(getId(item)))
  );

  const someSelected = computed(
    () => pageItemsRef.value.some((item) => selectedIds.value.includes(getId(item)))
      && !allSelected.value
  );

  const isSelected = (id) => selectedIds.value.includes(id);

  const toggleSelected = (id) => {
    if (isSelected(id)) {
      selectedIds.value = selectedIds.value.filter((selectedId) => selectedId !== id);
      return;
    }
    selectedIds.value = [...selectedIds.value, id];
  };

  const toggleSelectAll = () => {
    if (allSelected.value) {
      const pageIds = new Set(pageItemsRef.value.map(getId));
      selectedIds.value = selectedIds.value.filter((id) => !pageIds.has(id));
      return;
    }

    const merged = new Set([...selectedIds.value, ...pageItemsRef.value.map(getId)]);
    selectedIds.value = [...merged];
  };

  const clearSelection = () => {
    selectedIds.value = [];
  };

  return {
    selectedIds,
    selectedItems,
    allSelected,
    someSelected,
    isSelected,
    toggleSelected,
    toggleSelectAll,
    clearSelection
  };
};
