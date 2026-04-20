<script setup>
import { ref } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, push } from 'firebase/database';

const form = ref({
  firstName: '',
  lastName: '',
  affiliation: '',
  studentType: '',
  hadPlotLastYear: false,
  plotNumbers: '',
  forgotPlotNumber: false,
  lastYearName: '',
  lastYearEmail: '',
  sharingPlot: false,
  partnerName: '',
  partnerEmail: '',
  agreeRules: false,
  agreeLiability: false
});

const affiliationOptions = ['Student', 'Faculty', 'Staff', 'Emeriti', 'None'];
const studentTypeOptions = ['Graduate', 'Undergraduate'];

const loading = ref(false);
const submitted = ref(false);

const submit = async () => {
  // Validate required fields
  if (!form.value.firstName || !form.value.lastName || !form.value.affiliation) {
    alert('Please fill in all required fields');
    return;
  }
  if (!form.value.agreeRules || !form.value.agreeLiability) {
    alert('Please agree to the rules and liability waiver');
    return;
  }

  loading.value = true;
  try {
    const returningRef = dbRef(database, 'returning-gardeners');
    await push(returningRef, {
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      affiliation: form.value.affiliation,
      studentType: form.value.affiliation === 'Student' ? form.value.studentType : null,
      hadPlotLastYear: form.value.hadPlotLastYear,
      plotNumbers: form.value.hadPlotLastYear && !form.value.forgotPlotNumber ? form.value.plotNumbers : null,
      forgotPlotNumber: form.value.forgotPlotNumber,
      lastYearName: form.value.hadPlotLastYear ? form.value.lastYearName : null,
      lastYearEmail: form.value.hadPlotLastYear ? form.value.lastYearEmail : null,
      sharingPlot: form.value.sharingPlot,
      partner: form.value.sharingPlot ? {
        name: form.value.partnerName,
        email: form.value.partnerEmail
      } : null,
      agreeRules: form.value.agreeRules,
      agreeLiability: form.value.agreeLiability,
      createdAt: new Date().toISOString()
    });
    submitted.value = true;
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error submitting form. Please try again.');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="mt-8">
    <v-card class="pa-8">
      <v-card-title class="text-h4 mb-8">Returning Gardener Interest Form</v-card-title>

      <v-alert v-if="submitted" type="success" class="mb-6">
        Thank you for submitting your interest form! We'll be in touch soon.
      </v-alert>

      <v-form @submit.prevent="submit" v-if="!submitted">
        <!-- Basic Info -->
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

        <!-- UAF Affiliation -->
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="form.affiliation"
              :items="affiliationOptions"
              label="UAF Affiliation"
              required
            ></v-select>
          </v-col>
          <v-col cols="12" md="6" v-if="form.affiliation === 'Student'">
            <v-select
              v-model="form.studentType"
              :items="studentTypeOptions"
              label="Student Type"
              required
            ></v-select>
          </v-col>
        </v-row>

        <!-- Previous Plot Info -->
        <v-row>
          <v-col cols="12">
            <v-checkbox
              v-model="form.hadPlotLastYear"
              label="I had a plot last year"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-card v-if="form.hadPlotLastYear" class="mb-6 pa-4">
          <v-row>
            <v-col cols="12">
              <v-checkbox
                v-model="form.forgotPlotNumber"
                label="I forgot my plot number(s)"
              ></v-checkbox>
            </v-col>
          </v-row>

          <v-row v-if="!form.forgotPlotNumber">
            <v-col cols="12">
              <v-text-field
                v-model="form.plotNumbers"
                label="Plot Number(s)"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.lastYearName"
                label="Last Year's Name"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.lastYearEmail"
                label="Last Year's Email"
                type="email"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card>

        <!-- Sharing Plot -->
        <v-row>
          <v-col cols="12">
            <v-checkbox
              v-model="form.sharingPlot"
              label="I will be sharing my plot"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-card v-if="form.sharingPlot" class="mb-6 pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.partnerName"
                label="Partner Name"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.partnerEmail"
                label="Partner Email"
                type="email"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card>

        <!-- Agreements -->
        <v-row class="mt-6">
          <v-col cols="12">
            <v-checkbox
              v-model="form.agreeRules"
              label="I have read and agree to the Garden Rules and Etiquette"
            ></v-checkbox>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-checkbox
              v-model="form.agreeLiability"
              label="I have read and agree to the terms in the Garden Liability Waiver"
            ></v-checkbox>
          </v-col>
        </v-row>

        <!-- Submit -->
        <v-row class="mt-8">
          <v-col cols="12">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              :loading="loading"
              block
            >
              Submit Interest Form
            </v-btn>
          </v-col>
        </v-row>
      </v-form>
    </v-card>
  </v-container>
</template>
