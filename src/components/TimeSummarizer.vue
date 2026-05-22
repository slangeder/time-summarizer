<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <label class="block text-lg font-semibold text-slate-700">Input</label>
      <textarea 
        v-model="input" 
        rows="8" 
        class="w-full font-mono text-sm p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition-shadow resize-y"
        placeholder="08:00-12:00 Project A&#10;13:00-17:00 Project B"
      />
    </div>
    
    <button 
      @click="calculate" 
      :disabled="!input"
      class="w-full sm:w-auto px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-sm transition-colors"
    >
      Calculate
    </button>

    <div v-if="result" class="space-y-8 pt-8 border-t border-slate-200">
      
      <!-- Total Section -->
      <div class="bg-brand-darkest text-white rounded-xl p-6 text-center shadow-sm">
        <h2 class="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">Total Time</h2>
        <div class="font-mono text-4xl font-bold text-brand-accent">
          {{ durationToString(result.total.duration) }}
        </div>
      </div>

      <!-- Calculation Breakdown -->
      <div>
        <h2 class="text-lg font-semibold text-slate-700 mb-4">Calculation</h2>
        <div class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <ul class="divide-y divide-slate-200">
            <li v-for="(line, index) of result.parsed" :key="index" class="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-100 transition-colors">
              <span class="font-mono text-sm text-slate-600 break-all">{{ line.input }}</span>
              <span class="font-mono font-semibold text-brand-accent shrink-0">
                {{ durationToString(line.duration) }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Other Details -->
      <div>
        <h2 class="text-lg font-semibold text-slate-700 mb-4">Details</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div class="text-sm text-slate-500 mb-1">Work start</div>
            <div class="font-mono font-semibold text-slate-700">{{ durationToString(result.total.workStart) }}</div>
          </div>
          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div class="text-sm text-slate-500 mb-1">Normalized work end</div>
            <div class="font-mono font-semibold text-slate-700">{{ durationToString(result.total.normalizedWorkEnd) }}</div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script>
import TimeSummarizerLogic from "./TimeSummarizerLogic";

export default {
  name: "TimeSummarizer",
  props: {
    msg: String,
  },
  data() {
    return {
      input: "",
      result: undefined,
    };
  },
  methods: {
    calculate() {
      this.result = TimeSummarizerLogic.calculate(this.input);
    },

    durationToString(duration) {
      return (
        "+" +
        this.pad(Math.floor(duration.asHours()), 2) +
        ":" +
        this.pad(duration.minutes(), 2)
      );
    },

    pad(num, size) {
      num = num.toString();
      while (num.length < size) num = "0" + num;
      return num;
    },
  },
};
</script>
