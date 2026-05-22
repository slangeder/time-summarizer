<template>
  <div>
    <h2>Input</h2>
    <div>
      <textarea v-model="input" rows="10" />
    </div>
    <button @click="calculate" :disabled="!input">Calculate</button>

    <div v-if="result">
      <div style="margin-top: 2rem">
        <h2>Total</h2>
        <div class="mono">
          <span class="time-positive" style="border-bottom: 3px double">
            {{ durationToString(result.total.duration) }}
          </span>
        </div>
      </div>
      <div style="margin-top: 2rem">
        <h2>Calculation</h2>
        <div v-for="(line, index) of result.parsed" class="result-grid mono" :key="index">
          {{ line.input }}
          <span class="time-positive">
            {{ durationToString(line.duration) }}
          </span>
        </div>
      </div>
      <div style="margin-top: 2rem">
        <h2>Other</h2>
        <div class="mono">
          <div>
            Work start:
            {{ durationToString(result.total.workStart) }}
          </div>
          <div>
            Normalized work end:
            {{ durationToString(result.total.normalizedWorkEnd) }}
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
        this.pad(duration.hours(), 2) +
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.time-positive {
  color: #70A288;
  font-weight: 600;
}

button {
  background-color: #70A288;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  border: none;
}

button[disabled] {
  background-color: #B0B0B0;
  color: #EFEFEF;
  cursor: not-allowed;
}
</style>
