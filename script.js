
  const menu = document.querySelector('#menu');
  const iframe = document.querySelector('#myIframe');
  const items = [{"label":1,"value":"./output/1.html"},{"label":2,"value":"./output/2.html"},{"label":3,"value":"./output/3.html"},{"label":4,"value":"./output/4.html"},{"label":5,"value":"./output/5.html"},{"label":6,"value":"./output/6.html"}]

  // 动态生成菜单项
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.label;
    li.addEventListener('click', () => {
      iframe.src = item.value;
    });
    menu.appendChild(li);
  });
  