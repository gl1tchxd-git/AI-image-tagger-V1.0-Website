<script setup>
import { ref } from 'vue'

const images = ref(Array.from({ length: 30 }, (k, v) => v + 1))

async function api() {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(
        Array.from({ length: 10 }, (k, v) => v + images.value.at(-1) + 1)
      )
    }, 100)
  })
}
async function load({ done }) {
  // Perform API call
  const res = await api()

  images.value.push(...res)

  done('ok')
}
</script>

<template>
  <div id="container">
    <div id="search">
      <v-card>
        <p style="text-align: center; font-weight: bold; font-size: 30px">Search</p>
        <div class="tags">
          <p>Tags:</p>
          <v-textarea auto-grow clearable counter no-resize max-rows="5" rows="2">tag1, tag2, tag3</v-textarea>
        </div>
        <div class="tags">
          <p>Blacklist:</p>
          <v-textarea auto-grow clearable counter no-resize max-rows="5" rows="2">tag1, tag2, tag3</v-textarea>
        </div>
      </v-card>
    </div>
    <div id="gallery">
      <v-infinite-scroll :height="500" :items="images" :onLoad="load">
        <template v-for="(image, index) in images" :key="image">
          <div>
            image #{{ image }}
          </div>
          <div>
            image #{{ image }}
          </div>
          <div>
            image #{{ image }}
          </div>
        </template>
      </v-infinite-scroll>
    </div>
  </div>
</template>

<style scoped lang="css">
#container {
  width: 100%;
  height: 100%;
  //border: 10px solid red;
}
#search {
  width: 30%;
  float: left;
  //border: 1px solid green;
}
#gallery {
  width: 70%;
  float: right;
  //border: 1px solid blue;
}
</style>
