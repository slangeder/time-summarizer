<template>
  <details class="mt-12 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
    <summary class="cursor-pointer select-none px-6 py-3 font-semibold text-slate-700 hover:bg-slate-100">
      Normalization settings
    </summary>
    <div class="p-6 space-y-6 border-t border-slate-200">

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-slate-700">Break rules</label>
          <button
            type="button"
            @click="addRule"
            class="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700"
          >
            + Add rule
          </button>
        </div>
        <p class="text-xs text-slate-500">
          Highest matching rule wins. Empty → defaults (6h→30min, 9h→60min).
        </p>
        <div class="space-y-2">
          <div v-for="(rule, idx) of rules" :key="idx" class="flex items-center gap-2">
            <span class="text-xs text-slate-500">If worked ≥</span>
            <input
              type="number"
              min="0"
              step="0.5"
              v-model.number="rule.minWorkHours"
              class="w-20 px-2 py-1 text-sm border border-slate-300 rounded font-mono"
            />
            <span class="text-xs text-slate-500">h, insert</span>
            <input
              type="number"
              min="0"
              step="5"
              v-model.number="rule.pauseMinutes"
              class="w-20 px-2 py-1 text-sm border border-slate-300 rounded font-mono"
            />
            <span class="text-xs text-slate-500">min break</span>
            <button
              type="button"
              @click="removeRule(idx)"
              class="ml-auto text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            >
              Remove
            </button>
          </div>
          <p v-if="rules.length === 0" class="text-xs text-slate-400 italic">Using defaults.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="space-y-1 block">
          <span class="text-sm font-medium text-slate-700">Max consecutive hours</span>
          <input
            type="number"
            min="0"
            step="0.5"
            :value="model.maxConsecutiveHours ?? ''"
            @input="onMaxHoursInput"
            placeholder="default 6"
            class="w-full h-8 px-2 py-1 text-sm border border-slate-300 rounded font-mono"
          />
        </label>
        <label class="space-y-1 block">
          <span class="text-sm font-medium text-slate-700">Default break start</span>
          <input
            type="time"
            :value="model.defaultBreakStart ?? ''"
            @input="onBreakStartInput"
            placeholder="default 12:00"
            class="w-full h-8 px-2 py-1 text-sm border border-slate-300 rounded font-mono"
          />
        </label>
      </div>

      <button
        type="button"
        @click="resetAll"
        class="text-xs px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-medium text-slate-700"
      >
        Reset to defaults
      </button>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { NormalizationSettings, BreakRule } from "./NormalizationSettings";

const props = defineProps<{ modelValue: NormalizationSettings }>();
const emit = defineEmits<{ (e: "update:modelValue", v: NormalizationSettings): void }>();

const model = computed(() => props.modelValue);

const rules = computed<BreakRule[]>({
  get: () => props.modelValue.breakRules ?? [],
  set: (val) => emit("update:modelValue", { ...props.modelValue, breakRules: val }),
});

function addRule(): void {
  const next = [...rules.value, { minWorkHours: 0, pauseMinutes: 0 }];
  emit("update:modelValue", { ...props.modelValue, breakRules: next });
}

function removeRule(idx: number): void {
  const next = rules.value.filter((_, i) => i !== idx);
  const updated = { ...props.modelValue };
  if (next.length > 0) {
    updated.breakRules = next;
  } else {
    delete updated.breakRules;
  }
  emit("update:modelValue", updated);
}

function onMaxHoursInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value;
  const updated = { ...props.modelValue };
  if (v === "") delete updated.maxConsecutiveHours;
  else updated.maxConsecutiveHours = parseFloat(v);
  emit("update:modelValue", updated);
}

function onBreakStartInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value;
  const updated = { ...props.modelValue };
  if (v === "") delete updated.defaultBreakStart;
  else updated.defaultBreakStart = v;
  emit("update:modelValue", updated);
}

function resetAll(): void {
  emit("update:modelValue", {});
}
</script>
