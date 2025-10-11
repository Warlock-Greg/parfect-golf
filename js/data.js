import { GOLFS_JSON_URL, EXERCISE_JSON_URL } from "./config.js";

export async function fetchGolfs() {
  const res = await fetch(GOLFS_JSON_URL);
  return res.ok ? res.json() : [];
}

export async function fetchExercises() {
  const res = await fetch(EXERCISE_JSON_URL);
  return res.ok ? res.json() : [];
}
