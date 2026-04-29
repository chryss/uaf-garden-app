<script setup>
import { ref, onMounted } from 'vue';
import { initializeApp, deleteApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth, database } from '@/services/firebaseConfig';
import { ref as dbRef, get, set, remove, serverTimestamp } from 'firebase/database';

const loading = ref(false);
const saving = ref(false);
const currentAdminUid = ref('');
const admins = ref([]);
const adminLoading = ref(false);
const addingAdmin = ref(false);
const deletingAdminUid = ref('');
const newAdminEmail = ref('');
const adminError = ref('');
const adminMessage = ref('');

const cmsContent = ref({
  welcome: '',
  pleaseNote: '',
  registrationOpen: false,
  bannerImageUrl: '',
  prices: '',
  rules: [],
  resources: []
});

const newRuleText = ref('');
const newRuleUrl = ref('');
const newResourceText = ref('');
const newResourceUrl = ref('');

const normalizeEmail = (email) => email.trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateTempPassword = () => {
  const random = Math.random().toString(36).slice(-10);
  return `Tmp!${random}A9`;
};

const loadContent = async () => {
  loading.value = true;
  try {
    const cmsRef = dbRef(database, 'cms');
    const snapshot = await get(cmsRef);
    if (snapshot.exists()) {
      const value = snapshot.val();
      cmsContent.value = {
        welcome: value.welcome || '',
        pleaseNote: value.pleaseNote || '',
        registrationOpen: value.registrationOpen === true,
        bannerImageUrl: value.bannerImageUrl || '',
        prices: value.prices || '',
        rules: Array.isArray(value.rules) ? value.rules : [],
        resources: Array.isArray(value.resources) ? value.resources : []
      };
    }
  } catch (error) {
    console.error('Error loading CMS content:', error);
  } finally {
    loading.value = false;
  }
};

const loadAdmins = async () => {
  adminLoading.value = true;
  adminError.value = '';
  try {
    const adminsRef = dbRef(database, 'admins');
    const snapshot = await get(adminsRef);
    const records = snapshot.exists() ? snapshot.val() : {};
    admins.value = Object.entries(records)
      .map(([uid, value]) => ({
        uid,
        email: value?.email || '',
        role: value?.role || 'admin'
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  } catch (error) {
    console.error('Error loading admins:', error);
    adminError.value = 'Could not load admin users.';
  } finally {
    adminLoading.value = false;
  }
};

const addAdmin = async () => {
  adminError.value = '';
  adminMessage.value = '';
  const email = normalizeEmail(newAdminEmail.value);

  if (!isValidEmail(email)) {
    adminError.value = 'Enter a valid email address.';
    return;
  }

  const exists = admins.value.some((admin) => normalizeEmail(admin.email) === email);
  if (exists) {
    adminError.value = 'That email is already an admin.';
    return;
  }

  addingAdmin.value = true;
  let secondaryApp = null;
  try {
    secondaryApp = initializeApp(auth.app.options, `admin-create-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const tempPassword = generateTempPassword();
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);

    await set(dbRef(database, `admins/${credential.user.uid}`), {
      email,
      role: 'admin',
      createdAt: serverTimestamp()
    });

    await sendPasswordResetEmail(auth, email);
    adminMessage.value = 'Admin added. A password reset email was sent so they can set their password.';
    newAdminEmail.value = '';
    await loadAdmins();
    await signOut(secondaryAuth);
  } catch (error) {
    console.error('Error adding admin:', error);
    if (error?.code === 'auth/email-already-in-use') {
      adminError.value = 'That email already has an auth account. Add it manually by UID in /admins.';
    } else {
      adminError.value = error?.message || 'Could not add admin user.';
    }
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp);
    }
    addingAdmin.value = false;
  }
};

const removeAdmin = async (admin) => {
  adminError.value = '';
  adminMessage.value = '';

  if (admin.uid === currentAdminUid.value) {
    adminError.value = 'You cannot remove your own admin access.';
    return;
  }

  deletingAdminUid.value = admin.uid;
  try {
    await remove(dbRef(database, `admins/${admin.uid}`));
    adminMessage.value = `Removed admin access for ${admin.email || admin.uid}.`;
    await loadAdmins();
  } catch (error) {
    console.error('Error removing admin access:', error);
    adminError.value = error?.message || 'Could not remove admin user.';
  } finally {
    deletingAdminUid.value = '';
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
    cmsContent.value.rules = [
      ...(cmsContent.value.rules || []),
      {
        text: newRuleText.value,
        url: newRuleUrl.value
      }
    ];
    newRuleText.value = '';
    newRuleUrl.value = '';
  }
};

const removeRule = (index) => {
  cmsContent.value.rules = cmsContent.value.rules.filter((_, currentIndex) => currentIndex !== index);
};

const addResource = () => {
  if (newResourceText.value && newResourceUrl.value) {
    cmsContent.value.resources = [
      ...(cmsContent.value.resources || []),
      {
        text: newResourceText.value,
        url: newResourceUrl.value
      }
    ];
    newResourceText.value = '';
    newResourceUrl.value = '';
  }
};

const removeResource = (index) => {
  cmsContent.value.resources = cmsContent.value.resources.filter((_, currentIndex) => currentIndex !== index);
};

onMounted(async () => {
  currentAdminUid.value = auth.currentUser?.uid || '';
  await Promise.all([loadContent(), loadAdmins()]);
});
</script>

<template>
  <v-card class="pa-6">
    <v-card-title class="text-h5 px-0">Global configuration</v-card-title>
    <v-card-subtitle class="px-0 mb-4">Edit content and links shown on the public site.</v-card-subtitle>

    <v-row class="mb-8">
      <v-col cols="12">
        <h3 class="text-h6 mb-3">Admin Users</h3>
        <v-alert v-if="adminError" type="error" variant="tonal" class="mb-3">{{ adminError }}</v-alert>
        <v-alert v-if="adminMessage" type="success" variant="tonal" class="mb-3">{{ adminMessage }}</v-alert>

        <v-row class="mb-2">
          <v-col cols="12" md="8">
            <v-text-field
              v-model="newAdminEmail"
              label="Add admin by email"
              placeholder="newadmin@alaska.edu"
              hide-details
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="4" class="d-flex">
            <v-btn
              color="success"
              block
              :loading="addingAdmin"
              @click="addAdmin"
            >
              Add Admin
            </v-btn>
          </v-col>
        </v-row>

        <v-table density="comfortable">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th class="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="adminLoading">
              <td colspan="3" class="text-medium-emphasis">Loading admins…</td>
            </tr>
            <tr v-else-if="admins.length === 0">
              <td colspan="3" class="text-medium-emphasis">No admin users configured.</td>
            </tr>
            <tr v-for="admin in admins" :key="admin.uid">
              <td>{{ admin.email || admin.uid }}</td>
              <td>{{ admin.role }}</td>
              <td class="text-right">
                <v-btn
                  color="error"
                  variant="text"
                  :disabled="admin.uid === currentAdminUid || deletingAdminUid === admin.uid"
                  :loading="deletingAdminUid === admin.uid"
                  @click="removeAdmin(admin)"
                >
                  Delete
                </v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>

    <!-- Registration status -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-switch
          v-model="cmsContent.registrationOpen"
          label="Registration Open"
          hint="When off, the public registration forms are hidden."
          persistent-hint
          color="success"
          inset
        ></v-switch>
      </v-col>
    </v-row>

    <!-- Please note -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-textarea
          v-model="cmsContent.pleaseNote"
          label="Please Note Section"
          rows="5"
          hint="Markdown is supported. Leave this empty to hide the section on the homepage."
          persistent-hint
        ></v-textarea>
      </v-col>
    </v-row>

    <!-- Welcome Text -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-textarea
          v-model="cmsContent.welcome"
          label="Welcome Text"
          rows="4"
          hint="Markdown is supported, including line breaks and paragraphs."
          persistent-hint
        ></v-textarea>
      </v-col>
    </v-row>

    <!-- Branding -->
    <v-row class="mb-6">
      <v-col cols="12">
        <v-text-field
          v-model="cmsContent.bannerImageUrl"
          label="Home Banner Image URL"
          hint="Optional full-width banner image shown on the home page."
          persistent-hint
        ></v-text-field>
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
