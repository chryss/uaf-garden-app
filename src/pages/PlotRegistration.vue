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
  studentType: '',  // Graduate, Undergraduate or Non-Degree Seeking (only if affiliation = Student)
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
const plotLimitOverridesByEmail = ref({});
const registrationOpen = ref(false);
const settingsLoaded = ref(false);
const rulesLinks = ref([]);
const paymentURL = 'https://epay.alaska.edu/C21563_ustores/web/store_main.jsp?STOREID=88';
const selectedPlotIds = computed(() =>
  form.value.plots
    .map((plot) => plot.plotId)
    .filter(Boolean)
);
const currentMaxPlots = computed(() => plotLimitOverridesByEmail.value[normalizeEmail(form.value.email)] || maxPlots.value);

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const makeGardenerIdFromEmail = (email) => {
  const safeEmail = normalizeEmail(email)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `gardener-${safeEmail || 'unknown'}`;
};

const findCmsRuleLink = (matcher) => {
  const entry = rulesLinks.value.find((rule) => matcher.test(String(rule?.text || '')));
  const url = String(entry?.url || '').trim();
  return url || '';
};

const rulesEtiquetteUrl = computed(() => findCmsRuleLink(/rules?|etiquette/i));
const liabilityWaiverUrl = computed(() => findCmsRuleLink(/waiver|liability/i));
const normalizePlotLimitOverrides = (rawValue) => {
  const rawEntries = Array.isArray(rawValue)
    ? rawValue
    : (rawValue && typeof rawValue === 'object')
      ? Object.entries(rawValue).map(([email, maxPlots]) => ({ email, maxPlots }))
      : [];

  return rawEntries.reduce((acc, entry) => {
    const email = normalizeEmail(entry?.email || '');
    const maxPlotsValue = Number(entry?.maxPlots);
    if (email && Number.isInteger(maxPlotsValue) && maxPlotsValue >= 1) {
      acc[email] = maxPlotsValue;
    }
    return acc;
  }, {});
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
      const cms = snapshot.val();
      registrationOpen.value = cms.registrationOpen === true;
      const configuredLimit = Number(cms.maxPlotsPerGardener);
      maxPlots.value = [1, 2, 3, 4].includes(configuredLimit) ? configuredLimit : 2;
      plotLimitOverridesByEmail.value = normalizePlotLimitOverrides(cms.plotLimitOverrides || cms.plotLimitOverridesByEmail);
      rulesLinks.value = Array.isArray(cms.rules) ? cms.rules : [];
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
  if (form.value.plots.length < currentMaxPlots.value) {
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

const collectPlotIdsFromGardener = (gardener) =>
  [
    gardener?.plotId,
    ...(Array.isArray(gardener?.plots) ? gardener.plots : [])
  ]
    .filter(Boolean)
    .map((plotId) => String(plotId).trim());

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const sanitizePartnersFromForm = (partners = []) =>
  partners
    .map((partner) => {
      const name = String(partner?.name || '').trim();
      const emailRaw = normalizeEmail(partner?.email || '');
      return {
        name: name || null,
        email: emailRaw && isValidEmail(emailRaw) ? emailRaw : null
      };
    })
    .filter((partner) => partner.name || partner.email);

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
    const existingPlotIdsFromRecord = collectPlotIdsFromGardener(existingGardener);
    const existingPlotIdsFromAssignments = plots.value
      .filter((plot) => plot?.registeredGardenerId === gardenerId)
      .map((plot) => String(plot.id || '').trim())
      .filter(Boolean);

    let existingPlotIdsFromEmailMatches = [];
    try {
      const gardenersSnapshot = await get(dbRef(database, 'gardeners'));
      if (gardenersSnapshot.exists()) {
        existingPlotIdsFromEmailMatches = Object.values(gardenersSnapshot.val())
          .filter((gardener) => normalizeEmail(gardener?.email) === normalizedEmail)
          .flatMap((gardener) => collectPlotIdsFromGardener(gardener));
      }
    } catch {
      // Public clients may not have read access to /gardeners; ID + plot-assignment checks still apply.
    }

    const existingPlotIds = [
      ...new Set([
        ...existingPlotIdsFromRecord,
        ...existingPlotIdsFromAssignments,
        ...existingPlotIdsFromEmailMatches
      ])
    ];

    const mergedPlotIds = [...new Set([...existingPlotIds, ...selectedPlotIdsForSubmission])];
    const isAddingNewPlots = mergedPlotIds.length > existingPlotIds.length;
    const effectiveMaxPlots = plotLimitOverridesByEmail.value[normalizedEmail] || maxPlots.value;

    if (mergedPlotIds.length > effectiveMaxPlots && isAddingNewPlots) {
      alert(`This gardener can register up to ${effectiveMaxPlots} plot${effectiveMaxPlots === 1 ? '' : 's'}.`);
      return;
    }

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
      partners: sanitizePartnersFromForm(form.value.partners),
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
              v-if="form.plots.length < currentMaxPlots"
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
                <span class="agreement-checkbox__label">
                  I agree to the
                  <a
                    v-if="rulesEtiquetteUrl"
                    :href="rulesEtiquetteUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="agreement-link"
                    @click.stop
                  >
                    Garden Rules and Etiquette
                  </a>
                  <template v-else>Garden Rules and Etiquette</template>
                </span>
              </label>
              <label class="agreement-checkbox">
                <input v-model="form.agreeWaiver" type="checkbox" />
                <span class="agreement-checkbox__box" aria-hidden="true"></span>
                <span class="agreement-checkbox__label">
                  I agree to the
                  <a
                    v-if="liabilityWaiverUrl"
                    :href="liabilityWaiverUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="agreement-link"
                    @click.stop
                  >
                    Liability Waiver
                  </a>
                  <template v-else>Liability Waiver</template>
                </span>
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

.agreement-link {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
}
</style>
