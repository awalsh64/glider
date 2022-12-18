<template>
  <v-app dark>
    <v-navigation-drawer
      v-model="drawer"
      :mini-variant="miniVariant"
      clipped
      fixed
      app
    >
      <v-list>
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          :to="item.to"
          router
          exact
        >
          <v-list-item-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title v-text="item.title" />
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar clipped-left fixed app dense>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" />
      <v-toolbar-title dense v-text="title" />
      <v-spacer />
    </v-app-bar>
    <v-main>
      <Nuxt />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'DefaultLayout',
  data() {
    return {
      drawer: false,
      fixed: false,
      items: [
        {
          icon: 'mdi-home',
          title: 'Welcome',
          to: '/',
        },
        {
          icon: 'mdi-upload',
          title: 'Import',
          to: '/import-files',
        },
      ],
      miniVariant: false,
      title: 'Glider Data Viewer',
    };
  },
};
</script>
