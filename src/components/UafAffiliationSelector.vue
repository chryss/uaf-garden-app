<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  studentType: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'update:studentType']);

const affiliationOptions = ['Student', 'Faculty', 'Staff', 'Emeriti', 'None'];
const studentTypeOptions = ['Graduate', 'Undergraduate'];

const selectedAffiliations = computed(() => props.modelValue || []);
const hasStudentAffiliation = computed(() => selectedAffiliations.value.includes('Student'));

const updateAffiliation = (option, checked) => {
  const next = new Set(selectedAffiliations.value);
  if (checked) {
    next.add(option);
  } else {
    next.delete(option);
  }

  const normalized = affiliationOptions.filter((item) => next.has(item));
  emit('update:modelValue', normalized);

  if (!normalized.includes('Student')) {
    emit('update:studentType', '');
  }
};
</script>

<template>
  <v-row class="mt-4">
    <v-col cols="12">
      <div class="form-section-title">UAF Affiliation</div>
      <div class="form-soft-panel">
        <div class="affiliation-options">
        <label
          v-for="option in affiliationOptions"
          :key="option"
          class="affiliation-option agreement-checkbox"
        >
          <input
            :id="`affiliation-${option}`"
            :checked="selectedAffiliations.includes(option)"
            type="checkbox"
            @change="(event) => updateAffiliation(option, event.target.checked)"
          />
          <span class="agreement-checkbox__box" aria-hidden="true"></span>
          <span class="agreement-checkbox__label">{{ option }}</span>
        </label>
        </div>
      </div>
    </v-col>

    <v-col v-if="hasStudentAffiliation" cols="12" class="student-type">
      <div class="student-type-title">Student Type</div>
      <v-radio-group
        :model-value="studentType"
        inline
        class="justify-center"
        hide-details
        @update:model-value="(value) => emit('update:studentType', value)"
      >
        <v-radio
          v-for="option in studentTypeOptions"
          :key="option"
          :label="option"
          :value="option"
        />
      </v-radio-group>
    </v-col>
  </v-row>
</template>

<style scoped>
.affiliation-options {
  display: flex;
  flex-wrap: nowrap;
  gap: 18px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.affiliation-option {
  flex: 0 0 auto;
}

.student-type {
  margin-top: 8px;
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

.student-type-title {
  font-size: 0.98rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 8px;
}

.form-soft-panel {
  border: 1px solid rgba(27, 94, 32, 0.14);
  border-radius: 12px;
  background: rgba(27, 94, 32, 0.04);
  padding: 12px 14px 8px;
}

.agreement-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  user-select: none;
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
  line-height: 1.2;
}
</style>
