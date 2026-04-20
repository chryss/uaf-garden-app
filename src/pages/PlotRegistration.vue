<script setup>
import { ref } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, push, get } from 'firebase/database';

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  plotId: '',
  partners: [{ name: '', email: '' }]
});

const plots = ref([]);
const loading = ref(false);
const submitted = ref(false);

// Load available plots
const loadPlots = async () => {
  const plotsRef = dbRef(database, 'plots');
  const snapshot = await get(plotsRef);
  if (snapshot.exists()) {
    plots.value = Object.entries(snapshot.val()).map(([id, data]) => ({
      id,
      ...data
    }));
  }
};

const addPartner = () => {
  form.value.partners.push({ name: '', email: '' });
};

const removePartner = (index) => {
  form.value.partners.splice(index, 1);
};

const submit = async () => {
  loading.value = true;
  try {
    const gardenersRef = dbRef(database, 'gardeners');
    await push(gardenersRef, {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: form.value.email,
      plotId: form.value.plotId,
      partners: form.value.partners.filter(p => p.name || p.email),
      paymentVerified: false,
      createdAt: new Date().toISOString()
    });
    submitted.value = true;
    form.value = {
      firstName: '',
      lastName: '',
      email: '',
      plotId: '',
      partners: [{ name: '', email: '' }]
    };
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error submitting form. Please try again.');
  } finally {
    loading.value = false;
  }
};

loadPlots();
</script>

<template>
  <v-container class="mt-8">
    <v-card class="pa-8">
      <v-card-title class="text-h4 mb-8">Plot Registration</v-card-title>

      <v-alert v-if="submitted" type="success" class="mb-6">
        Thank you for registering! Please complete payment at the UAF Mall and return here for validation.
      </v-alert>

      <v-form @submit.prevent="submit" v-if="!submitted">
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.firstName"
              label="First Name"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.lastName"
              label="Last Name"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-select
              v-model="form.plotId"
              :items="plots.filter(p => p.status === 'available')"
              item-title="name"
              item-value="id"
              label="Select Plot"
              required
            ></v-select>
          </v-col>
        </v-row>

        <v-row class="mt-4">
          <v-col cols="12">
            <h3 class="text-h6 mb-4">Partners (optional)</h3>
            <v-card v-for="(partner, index) in form.partners" :key="index" class="mb-4 pa-4">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="partner.name"
                    label="Partner Name"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="partner.email"
                    label="Partner Email"
                    type="email"
                  ></v-text-field>
                </v-col>
              </v-row>
              <v-btn
                v-if="form.partners.length > 1"
                size="small"
                color="error"
                @click="removePartner(index)"
              >
                Remove Partner
              </v-btn>
            </v-card>
            <v-btn @click="addPartner" class="mb-6">Add Another Partner</v-btn>
          </v-col>
        </v-row>

        <v-row class="mt-6">
          <v-col cols="12">
            <p class="text-body2 mb-4">
              After registering, please complete payment at the
              <a href="https://uaf.edu/students/student-services/one-stop-shop/" target="_blank">UAF Mall</a>
            </p>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              :loading="loading"
              block
            >
              Submit Registration
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>
