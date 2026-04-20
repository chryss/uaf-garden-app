<script setup>
import { ref, onMounted } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, update } from 'firebase/database';

const plots = ref([]);
const loading = ref(true);
const plotTypes = ['regular', 'needs work', 'special project'];
const plotStatuses = ['available', 'reserved', 'verified', 'unavailable'];

const loadPlots = async () => {
  try {
    const plotsRef = dbRef(database, 'plots');
    const snapshot = await get(plotsRef);
    if (snapshot.exists()) {
      plots.value = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data
      })).sort((a, b) => Number(a.id.split('-')[1]) - Number(b.id.split('-')[1]));
    }
  } catch (error) {
    console.error('Error loading plots:', error);
  } finally {
    loading.value = false;
  }
};

const markAsPaid = async (plotId) => {
  try {
    const plotRef = dbRef(database, `plots/${plotId}`);
    await update(plotRef, { paymentVerified: true, status: 'verified' });
    await loadPlots();
  } catch (error) {
    console.error('Error updating plot:', error);
  }
};

const savePlot = async (plot) => {
  try {
    const plotRef = dbRef(database, `plots/${plot.id}`);
    await update(plotRef, {
      type: plot.type || 'regular',
      status: plot.status || 'available',
      paymentVerified: plot.status === 'verified'
    });
    await loadPlots();
  } catch (error) {
    console.error('Error saving plot:', error);
  }
};

onMounted(loadPlots);
</script>

<template>
  <v-card class="pa-6">
    <v-card-title class="text-h5 px-0">Plot reservation management</v-card-title>
    <v-data-table
      :headers="[
        { title: 'Plot ID', key: 'id' },
        { title: 'Name', key: 'name' },
        { title: 'Type', key: 'type' },
        { title: 'Status', key: 'status' },
        { title: 'Registered Gardener', key: 'registeredGardenerId' },
        { title: 'Payment Verified', key: 'paymentVerified' },
        { title: 'Actions', key: 'actions' }
      ]"
      :items="plots"
      :loading="loading"
      class="elevation-1"
    >
      <template v-slot:item.type="{ item }">
        <v-select
          v-model="item.raw.type"
          :items="plotTypes"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 160px;"
        />
      </template>

      <template v-slot:item.status="{ item }">
        <v-select
          v-model="item.raw.status"
          :items="plotStatuses"
          density="compact"
          hide-details
          variant="outlined"
          style="min-width: 140px;"
        />
      </template>

      <template v-slot:item.actions="{ item }">
        <div class="d-flex ga-2">
          <v-btn
            v-if="!item.raw.paymentVerified"
            size="small"
            color="success"
            @click="markAsPaid(item.raw.id)"
          >
            Mark as Paid
          </v-btn>
          <v-btn
            size="small"
            color="primary"
            variant="outlined"
            @click="savePlot(item.raw)"
          >
            Save
          </v-btn>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>
