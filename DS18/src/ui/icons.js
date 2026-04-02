export function renderIcon(name) {
  const icons = {
    hp: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 21s-6.7-4.35-9.3-8.07C.5 9.67 2.14 5 6.4 5c2.1 0 3.51 1.1 4.39 2.51C11.67 6.1 13.08 5 15.18 5 19.45 5 21.08 9.67 18.9 12.93 16.31 16.65 12 21 12 21Z"/>
      </svg>
    `,
    souls: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c4.42 0 8 3.13 8 7 0 5.31-5.65 10.27-8 13-2.35-2.73-8-7.69-8-13 0-3.87 3.58-7 8-7Zm0 4.3A2.7 2.7 0 1 0 12 11.7 2.7 2.7 0 0 0 12 6.3Z"/>
      </svg>
    `,
    flask: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 2h6v2l-1.5 1.5v3.25l4.62 7.37A4 4 0 0 1 14.73 22H9.27a4 4 0 0 1-3.39-5.88L10.5 8.75V5.5L9 4V2Z"/>
      </svg>
    `,
    boss: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 4 6v6c0 5.2 3.41 9.95 8 11 4.59-1.05 8-5.8 8-11V6l-8-4Zm0 6.2 2.7-1.7-.78 3.08L16.5 12l-3.15.21L12 15l-1.35-2.79L7.5 12l2.58-2.42L9.3 6.5 12 8.2Z"/>
      </svg>
    `,
    day: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-4 1.2 2.7L16 5l-2.8 1.2L12 9 10.8 6.2 8 5l2.8-1.3L12 1Zm8 10 3 1-3 1-1 3-1-3-3-1 3-1 1-3 1 3ZM6 17l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z"/>
      </svg>
    `,
    room: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 20V9l9-6 9 6v11h-6v-6H9v6H3Z"/>
      </svg>
    `,
    npc: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2.25c-4 0-7.25 2.24-7.25 5v1.75h14.5v-1.75c0-2.76-3.25-5-7.25-5Z"/>
      </svg>
    `,
    event: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>
      </svg>
    `,
    loot: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7 12 3l8 4-8 4-8-4Zm0 4.5 8 4 8-4V17l-8 4-8-4v-5.5Z"/>
      </svg>
    `,
    fog: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9a4 4 0 1 1 7.76-1.38A3.5 3.5 0 1 1 17.5 14H7a3 3 0 0 1-1-5Z"/>
      </svg>
    `,
    drag: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5h2v2H8V5Zm0 6h2v2H8v-2Zm0 6h2v2H8v-2Zm6-12h2v2h-2V5Zm0 6h2v2h-2v-2Zm0 6h2v2h-2v-2Z"/>
      </svg>
    `,
    shield: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 5 5v5c0 5 3.2 9.58 7 12 3.8-2.42 7-7 7-12V5l-7-3Z"/>
      </svg>
    `
  };

  return `<span class="ui-icon ui-icon-${name}">${icons[name] || icons.room}</span>`;
}
