<template>
  <TimeSummarizer />
</template>

<script>
import TimeSummarizer from "./components/TimeSummarizer.vue";
export default {
  name: "App",
  components: {
    TimeSummarizer: TimeSummarizer,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  line-height: 24px;
}

.mono {
  font-family: "Spline Sans Mono", monospace;
}
</style>