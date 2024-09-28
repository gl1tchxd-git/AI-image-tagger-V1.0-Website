<script setup>

import Gallery from "@/pages/gallery.vue";
</script>

<template>
  <v-toolbar>
    <v-toolbar-title>
      <v-icon icon="mdi-tag"/>
      Image Tagger
    </v-toolbar-title>
    <v-btn to="/gallery">Gallery</v-btn>
    <v-btn to="/upload">Upload</v-btn>
    <v-btn to="/about">About</v-btn>
  </v-toolbar>
</template>

<style scoped lang="sass">

</style>
