(() => {
  const data = JSON.parse(document.getElementById('feed-activity-data').textContent);
  const styles = getComputedStyle(document.documentElement);
  const color = name => styles.getPropertyValue(name).trim();
  const canvas = document.getElementById('feedActivityChart');
  canvas.setAttribute('aria-label', data.labels.map((hour,index)=>`${hour}: ${data.birds[index]} birds, ${data.cats[index]} cats`).join('; '));
  if (typeof Chart !== 'undefined') {
    new Chart(canvas, { type:'bar', data:{ labels:data.labels, datasets:[{label:'Birds',data:data.birds,backgroundColor:color('--accent'),borderRadius:3},{label:'Cats',data:data.cats,backgroundColor:color('--warning'),borderRadius:3}] }, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:color('--muted'),usePointStyle:true,padding:18}}},scales:{x:{grid:{display:false},ticks:{color:color('--muted'),maxTicksLimit:12,maxRotation:0}},y:{beginAtZero:true,ticks:{precision:0,color:color('--muted')},grid:{color:color('--border')}}} } });
  } else {
    canvas.hidden = true;
    document.getElementById('feedChartFallback').hidden = false;
  }
  // Stop a collapsed clip so it cannot continue playing out of view.
  document.querySelectorAll('.feed-sighting-details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) details.querySelectorAll('video').forEach(video => video.pause());
    });
  });
  const mode = document.getElementById('feed-config');
  const buttons = [...document.querySelectorAll('[data-feed-sound], [data-feed-weather]')];
  buttons.forEach(button => button.addEventListener('click', async () => {
    const status = document.getElementById('feedCommandStatus');
    const weather = button.hasAttribute('data-feed-weather');
    buttons.forEach(item=>{item.disabled=true;});
    status.textContent = 'Sending command…';
    try {
      const headers = { 'x-csrf-token': mode.dataset.csrf || '' };
      const response = weather ? await fetch('/api/update-weather', {method:'POST',headers}) : await fetch('/api/send-update', {method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({type:'play_sound',sound:button.dataset.feedSound})});
      if (!response.ok) throw new Error('Command failed');
      status.textContent = weather ? 'Weather update requested.' : 'Sound requested.';
    } catch (_) { status.textContent = 'Unable to send the command. Please try again.'; }
    finally {buttons.forEach(item=>{item.disabled=false;});}
  }));
})();
