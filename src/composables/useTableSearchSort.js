import { computed, ref } from 'vue';

const defaultCompare = (a, b, key, direction) => {
  const aValue = String(a?.[key] ?? '').toLowerCase();
  const bValue = String(b?.[key] ?? '').toLowerCase();
  return aValue.localeCompare(bValue) * direction;
};

export const useTableSearchSort = (itemsRef, options) => {
  const {
    defaultSortKey,
    searchValues = () => [],
    compare = defaultCompare
  } = options;

  const sortKey = ref(defaultSortKey);
  const sortDirection = ref('asc');
  const searchQuery = ref('');

  const filteredItems = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return itemsRef.value;

    return itemsRef.value.filter((item) =>
      searchValues(item).some((value) => String(value ?? '').toLowerCase().includes(query))
    );
  });

  const sortedItems = computed(() => {
    const direction = sortDirection.value === 'asc' ? 1 : -1;
    const result = [...filteredItems.value];
    result.sort((a, b) => compare(a, b, sortKey.value, direction));
    return result;
  });

  const toggleSort = (key) => {
    if (sortKey.value === key) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      return;
    }
    sortKey.value = key;
    sortDirection.value = 'asc';
  };

  const sortIcon = (key) => {
    if (sortKey.value !== key) return 'mdi-swap-vertical';
    return sortDirection.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down';
  };

  return {
    sortKey,
    sortDirection,
    searchQuery,
    filteredItems,
    sortedItems,
    toggleSort,
    sortIcon
  };
};
