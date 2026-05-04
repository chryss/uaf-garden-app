import { computed, ref, watch } from 'vue';

export const tablePageSizeOptions = [
  { title: '15', value: 15 },
  { title: '30', value: 30 },
  { title: '45', value: 45 },
  { title: 'All', value: 'all' }
];

export const useTablePagination = (itemsRef, initialPageSize = 15) => {
  const page = ref(1);
  const pageSize = ref(initialPageSize);

  const totalItems = computed(() => itemsRef.value.length);
  const totalPages = computed(() => {
    if (pageSize.value === 'all') return 1;
    return Math.max(1, Math.ceil(totalItems.value / Number(pageSize.value)));
  });

  const paginatedItems = computed(() => {
    if (pageSize.value === 'all') return itemsRef.value;
    const start = (page.value - 1) * Number(pageSize.value);
    return itemsRef.value.slice(start, start + Number(pageSize.value));
  });

  const resetPage = () => {
    page.value = 1;
  };

  watch(pageSize, resetPage);
  watch(totalPages, (nextTotalPages) => {
    if (page.value > nextTotalPages) {
      page.value = nextTotalPages;
    }
  });

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    resetPage
  };
};
