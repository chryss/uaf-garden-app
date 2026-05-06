<template>
  <v-footer class="public-footer">
    <div class="public-footer__inner">
      <p class="public-footer__text">
        The <a href="https://www.alaska.edu" target="_blank"
          rel="noopener noreferrer">University of Alaska</a> is an Equal Opportunity/Equal Access Employer and Educational
        Institution. The University is committed to a <a
          href="https://www.alaska.edu/nondiscrimination" target="_blank"
          rel="noopener noreferrer">policy of non-discrimination</a> against individuals on the basis of any
        legally protected status.
      </p>
    </div>
  </v-footer>
</template>

<style scoped>
.public-footer {
  margin-top: 32px;
  padding: 20px 0 28px;
  background: rgba(var(--v-theme-surface), 0.92);
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.public-footer__inner {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
}

.public-footer__text {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.5;
}

.public-footer__text a {
  color: inherit;
  font-weight: 600;
}
</style>
