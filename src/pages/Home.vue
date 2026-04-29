<script setup>
import { onMounted, ref } from 'vue';
import MarkdownIt from 'markdown-it';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get } from 'firebase/database';
import PublicPageHeader from '@/components/PublicPageHeader.vue';
import gardenPhotoUrl from '../assets/gardenphoto.jpg';

const markdown = new MarkdownIt({
  breaks: true,
  linkify: true
});

const cmsContent = ref({
  welcome: '',
  pleaseNote: '',
  registrationOpen: false,
  bannerImageUrl: '',
  logoImageUrl: '',
  prices: '',
  rules: [],
  resources: []
});

const loadContent = async () => {
  const cmsRef = dbRef(database, 'cms');
  const snapshot = await get(cmsRef);
  if (snapshot.exists()) {
    cmsContent.value = {
      ...cmsContent.value,
      ...snapshot.val()
    };
  }
};

const renderMarkdown = (value) => markdown.render(value || '');

onMounted(loadContent);

const returningGardenerCopy = `Let us know you're interested in gardening again this year.`;
const newGardenerCopy = `Sign up for a plot in our community garden.

Please contact uaf-garden@alaska.edu for sign-up periods.`;
</script>

<template>
  <v-container>
    <PublicPageHeader
      title="UAF Community Garden"
      :logo-url="cmsContent.logoImageUrl"
    />

    <v-card v-if="cmsContent.pleaseNote" class="mt-6 overflow-hidden home-note-card" rounded="lg">
      <v-card-title class="pa-6 pb-2 text-h5 home-note-title">Please note!</v-card-title>
      <v-card-text class="px-6 pb-6 pt-0">
        <div class="home-note" v-html="renderMarkdown(cmsContent.pleaseNote)"></div>
      </v-card-text>
    </v-card>

    <v-card v-if="cmsContent.bannerImageUrl" class="mt-6 overflow-hidden" rounded="lg">
      <v-img :src="cmsContent.bannerImageUrl" cover height="220" />
    </v-card>

    <v-row class="mt-8" align="stretch">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>Returning Gardener?</v-card-title>
          <v-card-text>
            <div class="home-card-copy" v-html="renderMarkdown(returningGardenerCopy)"></div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/returning-gardener">Returning Gardener Form</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>New Gardener?</v-card-title>
          <v-card-text>
            <div class="home-card-copy" v-html="renderMarkdown(newGardenerCopy)"></div>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" to="/plot-registration">Register for Plot</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <div class="mt-8 home-welcome-section">
      <v-card class="mb-4 overflow-hidden" rounded="lg">
        <v-img
          :src="gardenPhotoUrl"
          alt="Vegetables freshly harvested from the UAF Community Garden"
          cover
          height="260"
        />
      </v-card>

      <v-card v-if="cmsContent.welcome" class="pa-6" rounded="lg" variant="outlined">
        <v-card-title class="pa-0 mb-4 text-h5">Welcome</v-card-title>
        <div class="home-welcome" v-html="renderMarkdown(cmsContent.welcome)"></div>
      </v-card>
    </div>

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

<style scoped>
.home-card-copy :deep(p) {
  margin-bottom: 0.6rem;
}

.home-card-copy :deep(p:last-child) {
  margin-bottom: 0;
}

.home-welcome :deep(p) {
  margin-bottom: 0.75rem;
}

.home-welcome :deep(p:last-child) {
  margin-bottom: 0;
}

.home-welcome-section {
  text-align: left;
}

.home-note-card {
  background: #7a2f2b;
  color: #f8efe6;
}

.home-note-title {
  color: inherit;
}

.home-note :deep(p) {
  margin-bottom: 0.75rem;
}

.home-note :deep(p:last-child) {
  margin-bottom: 0;
}

.home-note :deep(a) {
  color: inherit;
  text-decoration: underline;
}
</style>
