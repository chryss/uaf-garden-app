import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';

export default createVuetify({
  components,
  directives,
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
