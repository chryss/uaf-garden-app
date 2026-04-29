import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { aliases, mdi } from 'vuetify/iconsets/mdi';

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#2E7D32',
          secondary: '#558B2F',
          accent: '#FFB300',
          error: '#E53935',
          warning: '#FB8C00',
          info: '#1976D2',
          success: '#43A047'
        }
      }
    }
  }
});
