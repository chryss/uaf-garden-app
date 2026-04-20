<script setup>
import { ref, onMounted } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get, set } from 'firebase/database';

const loading = ref(false);
const saving = ref(false);

const cmsContent = ref({
  welcome: '',
  prices: '',
  rules: [],
  resources: []
});

const newRuleText = ref('');
const newRuleUrl = ref('');
const newResourceText = ref('');
const newResourceUrl = ref('');

const loadContent = async () => {
  loading.value = true;
  try {
    const cmsRef = dbRef(database, 'cms');
    const snapshot = await get(cmsRef);
    if (snapshot.exists()) {
      cmsContent.value = snapshot.val();
    }
  } catch (error) {
    console.error('Error loading CMS content:', error);
  } finally {
    loading.value = false;
  }
};

const saveContent = async () => {
  saving.value = true;
  try {
    const cmsRef = dbRef(database, 'cms');
    await set(cmsRef, cmsContent.value);
    alert('Content saved successfully!');
  } catch (error) {
    console.error('Error saving content:', error);
    alert('Error saving content');
  } finally {
    saving.value = false;
  }
};

const addRule = () => {
  if (newRuleText.value && newRuleUrl.value) {
    cmsContent.value.rules.push({
      text: newRuleText.value,
      url: newRuleUrl.value
    });
    newRuleText.value = '';
    newRuleUrl.value = '';
  }
};

const removeRule = (index) => {
  cmsContent.value.rules.splice(index, 1);
};

const addResource = () => {
  if (newResourceText.value && newResourceUrl.value) {
    cmsContent.value.resources.push({
      text: newResourceText.value,
      url: newResourceUrl.value
    });
    newResourceText.value = '';
    newResourceUrl.value = '';
  }
};

const removeResource = (index) => {
  cmsContent.value.resources.splice(index, 1);
};

onMounted(loadContent);
</script>

<template>
  <v-card class="pa-6">
    <v-card-title class="text-h5 px-0">Global configuration</v-card-title>
    <v-card-subtitle class="px-0 mb-4">Edit content and links shown on the public site.</v-card-subtitle>

    <!-- Welcome Text -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-textarea
          v-model="cmsContent.welcome"
          label="Welcome Text"
          rows="4"
        ></v-textarea>
      </v-col>
    </v-row>

    <!-- Plot Prices -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-textarea
          v-model="cmsContent.prices"
          label="Plot Prices"
          rows="4"
        ></v-textarea>
      </v-col>
    </v-row>

    <!-- Garden Rules -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h3 class="text-h6 mb-4">Garden Rules & Links</h3>
        <v-card class="mb-4 pa-4" v-for="(rule, index) in cmsContent.rules" :key="index">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="rule.text" label="Rule Text"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="rule.url" label="URL"></v-text-field>
            </v-col>
          </v-row>
          <v-btn size="small" color="error" @click="removeRule(index)">Remove</v-btn>
        </v-card>

        <v-card class="mb-4 pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="newRuleText" label="New Rule Text"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="newRuleUrl" label="New Rule URL"></v-text-field>
            </v-col>
          </v-row>
          <v-btn color="success" @click="addRule">Add Rule</v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Resources -->
    <v-row class="mb-6">
      <v-col cols="12">
        <h3 class="text-h6 mb-4">Gardening Resources & Links</h3>
        <v-card class="mb-4 pa-4" v-for="(resource, index) in cmsContent.resources" :key="index">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="resource.text" label="Resource Text"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="resource.url" label="URL"></v-text-field>
            </v-col>
          </v-row>
          <v-btn size="small" color="error" @click="removeResource(index)">Remove</v-btn>
        </v-card>

        <v-card class="mb-4 pa-4">
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field v-model="newResourceText" label="New Resource Text"></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="newResourceUrl" label="New Resource URL"></v-text-field>
            </v-col>
          </v-row>
          <v-btn color="success" @click="addResource">Add Resource</v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Save Button -->
    <v-row>
      <v-col cols="12">
        <v-btn
          color="primary"
          size="large"
          :loading="saving"
          @click="saveContent"
        >
          Save All Changes
        </v-btn>
      </v-col>
    </v-row>
  </v-card>
</template>
