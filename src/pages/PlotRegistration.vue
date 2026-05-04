<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import PlotMapCanvas from '@/components/PlotMapCanvas.vue';
import PublicPageHeader from '@/components/PublicPageHeader.vue';
import UafAffiliationSelector from '@/components/UafAffiliationSelector.vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, set, update } from 'firebase/database';

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  affiliations: [],
  studentType: '',  // Graduate, Undergraduate (only if affiliation = Student)
  plots: [{ plotId: '' }],  // Array of plot selections
  agreeRules: false,
  agreeWaiver: false,
  partners: [{ name: '', email: '' }]
});

const formRef = ref(null);
const canvasRef = ref(null);
const plotRefs = ref([]);
const plots = ref([]);
const loading = ref(false);
const submitted = ref(false);
const maxPlots = ref(2);  // Default, can be set from CMS
const registrationOpen = ref(false);
const settingsLoaded = ref(false);
const paymentUrl = 'https://epay.alaska.edu/C21563_ustores/web/store_cat.jsp?STOREID=88&CATID=278';
const selectedPlotIds = computed(() =>
  form.value.plots
    .map((plot) => plot.plotId)
    .filter(Boolean)
);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const makeGardenerIdFromEmail = (email) => {
  const safeEmail = normalizeEmail(email)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `gardener-${safeEmail || 'unknown'}`;
};

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

const addPartner = () => {
  form.value.partners.push({ name: '', email: '' });
};

const removePartner = (index) => {
  form.value.partners.splice(index, 1);
};

const addPlot = () => {
  if (form.value.plots.length < maxPlots.value) {
    form.value.plots.push({ plotId: '' });
    // Scroll to canvas to select a plot
    setTimeout(() => {
      if (canvasRef.value) {
        canvasRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
};

const removePlot = (index) => {
  if (form.value.plots.length > 1) {
    form.value.plots.splice(index, 1);
  }
};

const getSelectedPlot = (plotId) => plots.value.find((plot) => plot.id === plotId);

const submit = async () => {
  // Validate required fields
  if (!form.value.firstName || !form.value.lastName || !form.value.email) {
    alert('Please fill in first name, last name, and email.');
    return;
  }
  if (!form.value.affiliations.length) {
    alert('Please select your UAF affiliation.');
    return;
  }
  if (form.value.affiliations.includes('Student') && !form.value.studentType) {
    alert('Please select your student type.');
    return;
  }
  if (!form.value.agreeRules || !form.value.agreeWaiver) {
    alert('Please agree to both the Garden Rules and Liability Waiver.');
    return;
  }
  const selectedPlotIdsForSubmission = form.value.plots.filter((p) => p.plotId).map((p) => p.plotId);

  if (!selectedPlotIdsForSubmission.length) {
    alert('Please select at least one plot.');
    return;
  }

  const hasUnavailableSelection = selectedPlotIdsForSubmission.some((plotId) => {
    const selectedPlot = getSelectedPlot(plotId);
    return !selectedPlot || selectedPlot.type === 'special project' || selectedPlot.status !== 'available';
  });

  if (hasUnavailableSelection) {
    alert('Please select an available plot.');
    return;
  }

  loading.value = true;
  try {
    const normalizedEmail = normalizeEmail(form.value.email);
    const gardenerId = makeGardenerIdFromEmail(normalizedEmail);
    const gardenerRef = dbRef(database, `gardeners/${gardenerId}`);
    const existingGardenerSnapshot = await get(gardenerRef);
    const existingGardener = existingGardenerSnapshot.exists() ? existingGardenerSnapshot.val() : null;
    const existingPlotIds = [
      existingGardener?.plotId,
      ...(Array.isArray(existingGardener?.plots) ? existingGardener.plots : [])
    ]
      .filter(Boolean)
      .map((plotId) => String(plotId).trim());

    const mergedPlotIds = [...new Set([...existingPlotIds, ...selectedPlotIdsForSubmission])];

    await set(gardenerRef, {
      ...(existingGardener || {}),
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      email: normalizedEmail,
      affiliations: form.value.affiliations,
      affiliation: form.value.affiliations[0] || null,
      studentType: form.value.affiliations.includes('Student') ? form.value.studentType : null,
      plotId: mergedPlotIds[0] || selectedPlotIdsForSubmission[0],
      plots: mergedPlotIds,
      partners: form.value.partners.filter(p => p.name || p.email),
      agreeRules: form.value.agreeRules,
      agreeWaiver: form.value.agreeWaiver,
      paymentVerified: false,
      createdAt: existingGardener?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await Promise.all(
      selectedPlotIdsForSubmission.map((plotId) =>
        update(dbRef(database, `plots/${plotId}`), {
          status: 'reserved',
          paymentVerified: false,
          registeredGardenerId: gardenerId
        })
      )
    );

    // Emit events to update canvas color for each plot
    selectedPlotIdsForSubmission.forEach((plotId) => {
      if (plotId) {
        const event = new CustomEvent('plot-registered', { 
          detail: { plotId } 
        });
        window.dispatchEvent(event);
      }
    });

    submitted.value = true;
    // Reset form
    form.value = {
      firstName: '',
      lastName: '',
      email: '',
      affiliations: [],
      studentType: '',
      plots: [{ plotId: '' }],
      agreeRules: false,
      agreeWaiver: false,
      partners: [{ name: '', email: '' }]
    };
  } catch (error) {
    console.error('Error submitting form:', error);
    alert('Error submitting form. Please try again.');
  } finally {
    loading.value = false;
  }
};

const handlePlotSelected = (e) => {
  const plotId = e.detail?.plotId;
  if (plotId) {
    const selectedPlot = getSelectedPlot(plotId);
    if (!selectedPlot || selectedPlot.type === 'special project' || selectedPlot.status !== 'available') {
      return;
    }

    // Find first empty plot slot and prefill it
    const emptyIndex = form.value.plots.findIndex(p => !p.plotId);
    if (emptyIndex !== -1) {
      form.value.plots[emptyIndex].plotId = plotId;

      setTimeout(() => {
        if (plotRefs.value[emptyIndex]) {
          plotRefs.value[emptyIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }
};

const handlePlotRegistered = () => {
  // Reserved for future toast/status messaging integration.
};

// Listen for plot-selected events from PlotMapCanvas
onMounted(async () => {
  await loadPlots();
  loadCmsSettings();

  window.addEventListener('plot-selected', handlePlotSelected);
  window.addEventListener('plot-registered', handlePlotRegistered);
});

onUnmounted(() => {
  window.removeEventListener('plot-selected', handlePlotSelected);
  window.removeEventListener('plot-registered', handlePlotRegistered);
});
</script>

<template>
  <v-container class="mt-8">
    <v-card class="pa-8">
      <PublicPageHeader
        title="Plot Registration"
        subtitle="Click on an available plot to register"
      show-home-link
    />

      <div class="payment-cta">
        <v-btn
          :href="paymentUrl"
          target="_blank"
          rel="noopener noreferrer"
          color="orange-darken-2"
          size="large"
        >
          Pay for your plots
        </v-btn>
        <v-btn
          to="/returning-gardener"
          color="success"
          size="large"
          variant="flat"
        >
          Returning gardener? Click here to reserve old plots
        </v-btn>
      </div>

      <div class="mb-6" ref="canvasRef">
        <PlotMapCanvas
          :selected-plot-ids="selectedPlotIds"
          :registration-open="registrationOpen"
        />
      </div>

      <template v-if="settingsLoaded && registrationOpen">
        <v-alert v-if="submitted" type="success" class="mb-6">
          Thank you for registering! Don't forget to
          <a :href="paymentUrl" target="_blank" rel="noopener noreferrer" class="payment-link">
            pay for your plots
          </a>
          . For any questions, please email uaf-garden@alaska.edu
        </v-alert>

        <v-form @submit.prevent="submit" v-if="!submitted" ref="formRef">
        <!-- Personal Information -->
        <v-row>
          <v-col cols="12">
            <h3 class="form-section-title">Gardener Information</h3>
          </v-col>
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
          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Email"
              type="email"
              required
            ></v-text-field>
          </v-col>
        </v-row>

        <UafAffiliationSelector
          v-model="form.affiliations"
          v-model:student-type="form.studentType"
        />

        <!-- Plot Selection -->
        <v-row class="mt-6">
          <v-col cols="12">
            <h3 class="form-section-title">Select plot(s) on map</h3>
          </v-col>
        </v-row>

        <v-row class="mt-6 align-center">
          <v-col
            cols="12"
            sm="6"
            md="4"
            lg="3"
            v-for="(plot, index) in form.plots"
            :key="`plot-${index}`"
          >
            <div class="mb-4 pa-4" :ref="el => plotRefs[index] = el">
              <div class="plot-field-label">
                Plot number
              </div>
              <v-text-field
                class="plot-number-input"
                :model-value="plot.plotId"
                readonly
                hide-details
                variant="outlined"
                density="compact"
                :required="index === 0"
              ></v-text-field>
              <v-btn
                v-if="form.plots.length > 1"
                class="mt-2"
                size="small"
                color="error"
                variant="text"
                @click="removePlot(index)"
              >
                Remove
              </v-btn>
            </div>
          </v-col>
          <v-col cols="12" sm="6" md="auto" class="d-flex align-end">
            <v-btn
              v-if="form.plots.length < maxPlots"
              @click="addPlot"
              color="primary"
              variant="outlined"
            >
              Add Another Plot
            </v-btn>
          </v-col>
        </v-row>

        <!-- Partners -->
        <v-row class="mt-6">
          <v-col cols="12">
            <h3 class="form-subtitle">Do you share your plot? Enter partner(s) below</h3>
            <v-card v-for="(partner, index) in form.partners" :key="`partner-${index}`" class="mb-4 pa-4">
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
            <v-btn @click="addPartner" variant="outlined" class="mb-6">
              Add Another Partner
            </v-btn>
          </v-col>
        </v-row>

        <!-- Agreements -->
        <v-row class="mt-8">
          <v-col cols="12">
            <h3 class="form-section-title">Please check all that apply</h3>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <div class="form-soft-panel">
              <label class="agreement-checkbox">
                <input v-model="form.agreeRules" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I agree to the Garden Rules and Etiquette</span>
              </label>
              <label class="agreement-checkbox">
                <input v-model="form.agreeWaiver" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">I agree to the Liability Waiver</span>
              </label>
            </div>
          </v-col>
        </v-row>

        <!-- Submit -->
        <v-row class="mt-8">
          <v-col cols="12">
            <v-btn
              color="primary"
              size="large"
              block
              type="submit"
              :loading="loading"
            >
              Submit Registration
            </v-btn>
          </v-col>
        </v-row>
        </v-form>
      </template>

      <v-alert v-else-if="settingsLoaded" type="warning" variant="tonal" class="mt-6">
        Registration is currently closed. For more information email uaf-garden@alaska.edu
      </v-alert>
    </v-card>
  </v-container>
</template>

<style scoped>
.payment-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 24px;
}

.payment-link {
  color: inherit;
  font-weight: 600;
}

.plot-field-meta {
  margin-bottom: 6px;
}

.plot-field-label,
.plot-field-hint {
  color: rgba(0, 0, 0, 0.6);
  font-size: 12px;
  line-height: 1.2;
}

.plot-field-label {
  font-weight: 500;
}

.plot-field-label__suffix {
  margin-left: 4px;
  font-weight: 400;
}

.plot-field-hint {
  margin-top: 2px;
}

.plot-number-input {
  max-width: 180px;
}

.form-section-title {
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.2;
  color: #1b5e20;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(27, 94, 32, 0.18);
}

.form-subtitle {
  font-size: 0.98rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 14px;
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
