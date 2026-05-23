<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-800 py-10 px-4">
    <div class="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6 sm:p-8">
      <h1 class="text-3xl font-bold text-center text-brand-darkest mb-8">Time Summarizer</h1>
      <TimeSummarizer />
    </div>
  </div>
</template>

<script setup lang="ts">
import TimeSummarizer from "./components/TimeSummarizer.vue";
</script>
