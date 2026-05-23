<template>
  <div class="space-y-8">
    <div class="space-y-3">
      <label class="block text-lg font-semibold text-slate-700">Input</label>
      <textarea
        v-model="input"
        rows="10"
        class="w-full font-mono text-sm p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition-shadow resize-y"
        placeholder="08:00-12:00&#10;13:00-17:00"
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

      <!-- Grand Total (only when multiple days) -->
      <div v-if="result.days.length > 1 && result.grandTotal" class="bg-brand-darkest text-white rounded-xl p-6 text-center shadow-sm">
        <h2 class="text-sm font-medium text-slate-300 uppercase tracking-wider mb-2">Grand Total ({{ result.days.length }} days)</h2>
        <div class="font-mono text-4xl font-bold text-brand-accent">
          {{ durationToString(result.grandTotal) }}
        </div>
      </div>

      <!-- Grand scope totals -->
      <div v-if="result.days.length > 1 && result.grandScopeTotals && result.grandScopeTotals.size > 0" class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
            <tr>
              <th class="text-left px-4 py-2 font-medium">Scope (all days)</th>
              <th class="text-right px-4 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="[scope, dur] of sortedScopes(result.grandScopeTotals)" :key="scope">
              <td class="px-4 py-2 font-mono text-slate-700">{{ scope }}</td>
              <td class="px-4 py-2 font-mono font-semibold text-brand-accent text-right">{{ durationToString(dur) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Per-day breakdown -->
      <div v-for="(day, dayIndex) of result.days" :key="dayIndex" class="space-y-4">
        <div class="flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
          <h2 class="text-lg font-semibold text-slate-700">
            {{ day.date ? day.date.format("ddd, DD.MM.YYYY") : "No date" }}
          </h2>
          <span v-if="day.total" class="font-mono font-bold text-brand-accent text-xl">
            {{ durationToString(day.total.duration) }}
          </span>
        </div>

        <div v-if="day.parsed.length > 0" class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <ul class="divide-y divide-slate-200">
            <li
              v-for="(line, index) of day.parsed"
              :key="index"
              class="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-colors"
              :class="line.valid ? 'hover:bg-slate-100' : 'bg-red-50 hover:bg-red-100'"
            >
              <span class="font-mono text-sm break-all" :class="line.valid ? 'text-slate-600' : 'text-red-700'">
                {{ line.valid ? formatRange(line) : line.input }}
              </span>
              <span v-if="line.valid" class="flex items-center gap-2 shrink-0">
                <span v-if="line.scope" class="font-mono text-xs tracking-wider text-slate-600 bg-slate-200 px-2 py-1 rounded">{{ line.scope }}</span>
                <span class="font-mono font-semibold text-brand-accent">{{ durationToString(line.duration) }}</span>
              </span>
              <span v-else class="font-mono text-xs font-semibold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-1 rounded shrink-0">
                Invalid
              </span>
            </li>
          </ul>
        </div>
        <p v-else class="text-sm text-slate-500 italic">No entries</p>

        <div v-if="day.scopeTotals && day.scopeTotals.size > 0" class="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th class="text-left px-4 py-2 font-medium">Scope</th>
                <th class="text-right px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="[scope, dur] of sortedScopes(day.scopeTotals)" :key="scope">
                <td class="px-4 py-2 font-mono text-slate-700">{{ scope }}</td>
                <td class="px-4 py-2 font-mono font-semibold text-brand-accent text-right">{{ durationToString(dur) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="day.total" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div class="text-sm text-slate-500 mb-1">Work start</div>
            <div class="font-mono font-semibold text-slate-700">{{ momentToString(day.total.workStart) }}</div>
          </div>
          <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div class="text-sm text-slate-500 mb-1">Normalized work end</div>
            <div class="font-mono font-semibold text-slate-700">{{ momentToString(day.total.normalizedWorkEnd) }}</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { Duration, Moment } from "moment";
import TimeSummarizerLogic, { type CalculationResult } from "./TimeSummarizerLogic";

defineProps<{ msg?: string }>();

const input = ref("");
const result = ref<CalculationResult | undefined>(undefined);

function calculate(): void {
  result.value = TimeSummarizerLogic.calculate(input.value);
}

function pad(num: number | string, size: number): string {
  let s = num.toString();
  while (s.length < size) s = "0" + s;
  return s;
}

function durationToString(duration: Duration): string {
  const totalMinutes = Math.floor(duration.asMinutes());
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return "+" + pad(hours, 2) + ":" + pad(minutes, 2);
}

function momentToString(m: Moment): string {
  return m.format("HH:mm");
}

function formatRange(line: { from: Moment; to: Moment }): string {
  return `${line.from.format("HH:mm")} - ${line.to.format("HH:mm")}`;
}

function sortedScopes(totals: Map<string, Duration>): [string, Duration][] {
  return [...totals.entries()].sort((a, b) => b[1].asMilliseconds() - a[1].asMilliseconds());
}
</script>
