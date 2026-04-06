export async function runTasksSequentially<T, TResult>(
  items: readonly T[],
  task: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const results: TResult[] = []

  for (let index = 0; index < items.length; index += 1) {
    results.push(await task(items[index]!, index))
  }

  return results
}
