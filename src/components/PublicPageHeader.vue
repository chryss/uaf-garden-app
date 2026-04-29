<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import defaultLogoUrl from '../assets/logo.9defa675.png';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  showHomeLink: {
    type: Boolean,
    default: false
  },
  logoUrl: {
    type: String,
    default: ''
  }
});

const router = useRouter();
const resolvedLogoUrl = computed(() => props.logoUrl || defaultLogoUrl);

const goHome = async () => {
  await router.push('/');
};
</script>

<template>
  <v-sheet class="public-page-header" rounded="lg">
    <div class="public-page-header__dev">DEVELOPMENT VERSION</div>
    <div class="public-page-header__inner">
      <v-img :src="resolvedLogoUrl" :alt="title" class="public-page-header__logo" contain />

      <div class="public-page-header__copy">
        <h1 class="public-page-header__title sr-only">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-2 public-page-header__subtitle">
          {{ subtitle }}
        </p>
      </div>

      <v-spacer />

      <v-btn v-if="showHomeLink" icon variant="text" @click="goHome" aria-label="Back to home">
        <v-icon>mdi-home</v-icon>
      </v-btn>
    </div>
  </v-sheet>
</template>

<style scoped>
.public-page-header {
  background: linear-gradient(180deg, #5b8fc5 0%, #4472a6 100%);
  border: 0;
  margin-top: 24px;
  padding: 16px 20px;
  color: #fff;
}

.public-page-header__dev {
  margin-bottom: 12px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.96);
}

.public-page-header__inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.public-page-header__logo {
  max-width: 360px;
  width: 100%;
  height: 68px;
  flex: 0 0 auto;
}

.public-page-header__copy {
  min-width: 0;
}

.public-page-header__title {
  margin: 0;
}

.public-page-header__subtitle {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.92);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
