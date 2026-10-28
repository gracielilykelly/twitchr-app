(() => {
  const data = JSON.parse(document.getElementById("insights-data").textContent);
  const styles = getComputedStyle(document.documentElement);
  const color = (name) => styles.getPropertyValue(name).trim();
  const accent = color("--accent"), warning = color("--warning"), muted = color("--muted"), border = color("--border");
  const hourly = (id, values, label, fill) => {
    const canvas = document.getElementById(id);
    canvas.setAttribute("aria-label", `${label}: ${values.map((value, index) => `${data.labels[index]}: ${value}`).join(", ")}`);
    new Chart(canvas, {
      type: "bar", data: { labels: data.labels, datasets: [{ label, data: values, backgroundColor: fill, borderRadius: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: muted, maxTicksLimit: 12, maxRotation: 0 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: muted, precision: 0 }, grid: { color: border } } } },
    });
  };
  hourly("insights-birds", data.birds, "Bird visits", accent);
  hourly("insights-cats", data.cats, "Cat detections", warning);
})();
