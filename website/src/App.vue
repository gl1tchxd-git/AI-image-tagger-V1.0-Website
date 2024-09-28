<template>
  <v-app>
    <v-main>
      <toolbar/>
      <router-view :key="$route.fullPath"/>
    </v-main>
  </v-app>
</template>

<script setup>
  //
import Toolbar from "@/components/Toolbar.vue";
</script>
