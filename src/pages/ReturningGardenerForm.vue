<script setup>
import { ref } from 'vue';
import PublicPageHeader from '@/components/PublicPageHeader.vue';
import UafAffiliationSelector from '@/components/UafAffiliationSelector.vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, set } from 'firebase/database';

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  affiliations: [],
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

const loading = ref(false);
const submitted = ref(false);
const registrationOpen = ref(false);
const settingsLoaded = ref(false);

const emailKeyFromEmail = (email) =>
  email
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, (char) => `_${char.charCodeAt(0)}_`);

const resetForm = () => {
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    affiliations: [],
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
  };
};

const loadCmsSettings = async () => {
  try {
    const cmsRef = dbRef(database, 'cms');
    const snapshot = await get(cmsRef);
    if (snapshot.exists()) {
      registrationOpen.value = snapshot.val().registrationOpen === true;
    }
  } finally {
    settingsLoaded.value = true;
  }
};

const submit = async () => {
  if (!form.value.firstName || !form.value.lastName || !form.value.email || !form.value.affiliations.length) {
    alert('Please fill in first name, last name, email, and UAF affiliation.');
    return;
  }

  if (form.value.affiliations.includes('Student') && !form.value.studentType) {
    alert('Please select your student type.');
    return;
  }

  if (!form.value.hadPlotLastYear) {
    alert('Please confirm whether you had a plot last year.');
    return;
  }

  if (form.value.hadPlotLastYear && !form.value.forgotPlotNumber && !form.value.plotNumbers.trim()) {
    alert('Please enter your previous plot number, or check that you forgot it.');
    return;
  }

  if (form.value.sharingPlot && !form.value.partnerName.trim()) {
    alert('Please enter the name of the person sharing your plot.');
    return;
  }

  if (!form.value.agreeRules || !form.value.agreeLiability) {
    alert('Please agree to the Garden Rules and Liability Waiver.');
    return;
  }

  loading.value = true;

  try {
    const normalizedEmail = form.value.email.trim().toLowerCase();
    const submissionRef = dbRef(database, `returning-gardeners/${emailKeyFromEmail(normalizedEmail)}`);

    await set(submissionRef, {
      status: 'incomplete',
      firstName: form.value.firstName.trim(),
      lastName: form.value.lastName.trim(),
      email: normalizedEmail,
      affiliations: form.value.affiliations,
      affiliation: form.value.affiliations[0] || null,
      studentType: form.value.affiliations.includes('Student') ? form.value.studentType : null,
      hadPlotLastYear: form.value.hadPlotLastYear,
      plotNumbers:
        form.value.hadPlotLastYear && !form.value.forgotPlotNumber
          ? form.value.plotNumbers.trim()
          : null,
      forgotPlotNumber: form.value.hadPlotLastYear ? form.value.forgotPlotNumber : false,
      lastYearName: form.value.hadPlotLastYear ? form.value.lastYearName.trim() || null : null,
      lastYearEmail:
        form.value.hadPlotLastYear && form.value.lastYearEmail.trim()
          ? form.value.lastYearEmail.trim().toLowerCase()
          : null,
      sharingPlot: form.value.sharingPlot,
      partner: form.value.sharingPlot
        ? {
            name: form.value.partnerName.trim(),
            email: form.value.partnerEmail.trim().toLowerCase() || null
          }
        : null,
      agreeRules: form.value.agreeRules,
      agreeLiability: form.value.agreeLiability,
      updatedAt: new Date().toISOString()
    });

    submitted.value = true;
    resetForm();
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error submitting form. Please try again.');
  } finally {
    loading.value = false;
  }
};

loadCmsSettings();
</script>

<template>
  <v-container class="mt-8">
    <v-card class="pa-8">
      <PublicPageHeader
        title="Returning Gardener Form"
        subtitle="Let us know if you’d like to keep your plot from last year."
        show-home-link
      />

      <v-alert type="info" variant="tonal" class="mb-6">
        If you submit this form more than once with the same email address, your previous submission will be overwritten.
      </v-alert>

      <template v-if="settingsLoaded && registrationOpen">
        <v-alert v-if="submitted" type="success" class="mb-6">
          Thank you for submitting your returning gardener interest form. We will follow up by email.
        </v-alert>

        <v-form v-if="!submitted" @submit.prevent="submit">
        <v-row>
          <v-col cols="12">
            <h3 class="form-section-title">Gardener Information</h3>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.firstName"
              label="First Name (required)"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="form.lastName"
              label="Last Name (required)"
              required
            ></v-text-field>
          </v-col>
          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Email (required)"
              type="email"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <UafAffiliationSelector
          v-model="form.affiliations"
          v-model:student-type="form.studentType"
        />

        <v-row class="mt-8">
          <v-col cols="12">
            <h3 class="form-section-title">Please check all that apply</h3>
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <div class="form-soft-panel">
              <label class="agreement-checkbox">
                <input v-model="form.hadPlotLastYear" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I had a plot last year (required).</span>
              </label>
            </div>
          </v-col>
        </v-row>

        <v-card v-if="form.hadPlotLastYear" class="mb-6 pa-4" variant="outlined">
          <label class="agreement-checkbox">
            <input v-model="form.forgotPlotNumber" type="checkbox" />
            <span class="agreement-checkbox__box" aria-hidden="true"></span>
            <span class="agreement-checkbox__label">I forgot my plot number.</span>
          </label>

          <v-row v-if="!form.forgotPlotNumber" class="mt-2">
            <v-col cols="12">
              <v-text-field
                v-model="form.plotNumbers"
                label="Plot number(s)/letter(s)"
                hint="Use the plot identifiers you remember from last season."
                persistent-hint
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.lastYearName"
                label="Last year's name"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.lastYearEmail"
                label="Last year's email (if different)"
                type="email"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card>

        <v-row class="mt-6">
          <v-col cols="12">
            <div class="form-soft-panel">
              <label class="agreement-checkbox">
                <input v-model="form.sharingPlot" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I will be sharing my plot.</span>
              </label>
            </div>
          </v-col>
        </v-row>

        <v-card v-if="form.sharingPlot" class="mb-6 pa-4" variant="outlined">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.partnerName"
                label="Partner name"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.partnerEmail"
                label="Partner email"
                type="email"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-card>

        <v-row class="mt-8">
          <v-col cols="12">
            <div class="form-soft-panel">
              <label class="agreement-checkbox">
                <input v-model="form.agreeRules" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I agree to the Garden Rules and Etiquette (required).</span>
              </label>

              <label class="agreement-checkbox">
                <input v-model="form.agreeLiability" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I agree to the Garden Liability Waiver (required).</span>
              </label>
            </div>
          </v-col>
        </v-row>

        <v-row class="mt-8">
          <v-col cols="12">
            <v-btn
              type="submit"
              color="primary"
              size="large"
              :loading="loading"
              block
            >
              Submit
            </v-btn>
          </v-col>
        </v-row>
        </v-form>
      </template>

      <v-alert v-else-if="settingsLoaded" type="warning" variant="tonal" class="mb-6">
        Registration is currently closed. Please wait for the homepage notice before trying again.
      </v-alert>
    </v-card>
  </v-container>
</template>

<style scoped>
.form-section-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
  color: #1b5e20;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(27, 94, 32, 0.18);
}

.form-soft-panel {
  border: 1px solid rgba(27, 94, 32, 0.14);
  border-radius: 12px;
  background: rgba(27, 94, 32, 0.04);
  padding: 14px 14px 4px;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  cursor: pointer;
  user-select: none;
  padding: 6px 2px;
}

.agreement-checkbox input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.agreement-checkbox__box {
  width: 22px;
  height: 22px;
  border: 2px solid rgb(25, 118, 210);
  border-radius: 4px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
}

.agreement-checkbox__box::after {
  content: '';
  width: 6px;
  height: 12px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  opacity: 0;
}

.agreement-checkbox input:checked + .agreement-checkbox__box {
  background: rgb(25, 118, 210);
}

.agreement-checkbox input:checked + .agreement-checkbox__box::after {
  opacity: 1;
}

.agreement-checkbox__label {
  line-height: 1.4;
}
</style>
