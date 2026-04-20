<script setup>
import { ref } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get } from 'firebase/database';

const cmsContent = ref(null);

// Load CMS content
const loadContent = async () => {
  const cmsRef = dbRef(database, 'cms');
  const snapshot = await get(cmsRef);
  if (snapshot.exists()) {
    cmsContent.value = snapshot.val();
  }
};

loadContent();
</script>

<template>
  <v-container>
    <v-row class="mt-8">
      <v-col cols="12">
        <h1 class="text-h3 mb-4">UAF Community Garden</h1>
        <p v-if="cmsContent?.welcome" class="text-h5">{{ cmsContent.welcome }}</p>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>New Gardener?</v-card-title>
          <v-card-text>
            <p>Sign up for a plot in our community garden.</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/plot-registration">Register for Plot</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Returning Gardener?</v-card-title>
          <v-card-text>
            <p>Let us know you're interested in gardening again this year.</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/returning-gardener">Returning Gardener Form</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Garden Rules & Information</h2>
        <v-list v-if="cmsContent?.rules" class="mb-4">
          <v-list-item v-for="(rule, index) in cmsContent.rules" :key="index">
            <a :href="rule.url" target="_blank" class="text-decoration-none">{{ rule.text }}</a>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Plot Prices</h2>
        <p v-if="cmsContent?.prices" class="text-body1">{{ cmsContent.prices }}</p>
      </v-col>
    </v-row>

    <v-row class="mt-8">
      <v-col cols="12">
        <h2 class="text-h4 mb-4">Gardening Resources</h2>
        <v-list v-if="cmsContent?.resources" class="mb-4">
          <v-list-item v-for="(resource, index) in cmsContent.resources" :key="index">
            <a :href="resource.url" target="_blank" class="text-decoration-none">{{ resource.text }}</a>
          </v-list-item>
        </v-list>
      </v-col>
    </v-row>
  </v-container>
</template>
