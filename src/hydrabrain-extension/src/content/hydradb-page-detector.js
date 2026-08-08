/**
 * HydraBrain — Page Detector & Data Extractor
 *
 * Content script that detects when the user is on a supported source page
 * (GitHub, Linear, Slack, Notion) and offers to sync structured data into
 * HydraDB via the browser extension.
 *
 * This is HydraBrain's "Universal Connector" — it can extract from any web app
 * using the accessibility tree, without requiring a native API connector.
 */

(function () {
  'use strict';

  const SUPPORTED_PAGES = {
    github_issue:  /github\.com\/[^/]+\/[^/]+\/issues\/\d+/,
    github_pr:     /github\.com\/[^/]+\/[^/]+\/pull\/\d+/,
    github_commit: /github\.com\/[^/]+\/[^/]+\/commit\/[0-9a-f]+/,
    linear_issue:  /linear\.app\/[^/]+\/issue\/[A-Z]+-\d+/,
    slack_channel: /app\.slack\.com\/(client|messages|archives)\//,
    notion_page:   /notion\.so\/[^/]+\/[^?]+/,
  };

  function detectPageType(url) {
    for (const [type, pattern] of Object.entries(SUPPORTED_PAGES)) {
      if (pattern.test(url)) return type;
    }
    return null;
  }

  function extractGitHub() {
    const url = window.location.href;
    const title = document.querySelector('h1 .js-issue-title, h1[class*="title"]')
      ?.textContent?.trim() || document.title.replace(' · GitHub', '').trim();
    const state = document.querySelector('.State, [data-testid="issue-state"]')
      ?.textContent?.trim() || 'unknown';
    const assignees = [...document.querySelectorAll('.assignee a, [data-testid="assignees-section"] a')]
      .map(el => el.textContent.trim()).filter(Boolean);
    const labels = [...document.querySelectorAll('.label, [data-testid="labels-section"] a')]
      .map(el => el.textContent.trim()).filter(Boolean);
    const body = document.querySelector('.comment-body, [data-testid="issue-body"] .markdown-body')
      ?.innerText?.trim() || '';
    const comments = [...document.querySelectorAll('.timeline-comment, [data-testid="comment"]')]
      .slice(0, 10).map(el => {
        const author = el.querySelector('.author, a[data-testid]')?.textContent?.trim() || '';
        const time = el.querySelector('relative-time, time')?.getAttribute('datetime') || '';
        const text = el.querySelector('.comment-body .markdown-body')?.innerText?.trim() || '';
        return author && text ? `[${author} @ ${time}]: ${text}` : text;
      }).filter(Boolean);

    const numMatch = url.match(/\/(issues|pull)\/(\d+)/);
    const number = numMatch ? numMatch[2] : '';
    const source = numMatch?.[1] === 'pull' ? 'github_pr' : 'github_issue';

    return {
      pageType: source, source: 'github', title, url, number, state, assignees, labels,
      text: [`# ${title}`, `URL: ${url}`, `State: ${state}`,
        assignees.length ? `Assignees: ${assignees.join(', ')}` : '',
        labels.length ? `Labels: ${labels.join(', ')}` : '',
        '', body, comments.length ? '\n## Comments\n' + comments.join('\n\n') : '',
      ].filter(Boolean).join('\n'),
    };
  }

  function extractLinear() {
    const url = window.location.href;
    const title = document.querySelector('h1[class*="title"], [class*="issueTitle"]')
      ?.textContent?.trim() || document.title.split(' - ')[0].trim();
    const idMatch = url.match(/issue\/([A-Z]+-\d+)/);
    const ticketId = idMatch ? idMatch[1] : '';
    const allText = document.body.innerText || '';
    const assigneeMatch = allText.match(/Assignee\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/);
    const priorityMatch = allText.match(/Priority\s+(Urgent|High|Medium|Low|No priority)/i);
    const statusMatch = allText.match(/(?:^|\n)(Todo|In Progress|Done|Cancelled|Backlog)\b/m);
    const projectMatch = allText.match(/Project\s+([^\n]{3,60})/);
    const description = document.querySelector('[class*="description"], [class*="content"]')
      ?.innerText?.trim() || '';
    const comments = [...document.querySelectorAll('[class*="comment"], [class*="activity"]')]
      .slice(0, 10).map(el => el.innerText?.trim()).filter(t => t && t.length > 10 && t.length < 2000);

    return {
      pageType: 'linear_issue', source: 'linear', title, url, ticketId,
      assignee: assigneeMatch?.[1] || '', priority: priorityMatch?.[1] || '',
      status: statusMatch?.[1] || '', project: projectMatch?.[1]?.trim() || '',
      text: [`# ${ticketId}: ${title}`, `URL: ${url}`,
        ticketId ? `Ticket: ${ticketId}` : '',
        assigneeMatch ? `Assignee: ${assigneeMatch[1]}` : '',
        priorityMatch ? `Priority: ${priorityMatch[1]}` : '',
        statusMatch ? `Status: ${statusMatch[1]}` : '',
        projectMatch ? `Project: ${projectMatch[1].trim()}` : '',
        '', description,
        comments.length ? '\n## Comments\n' + comments.join('\n\n') : '',
      ].filter(Boolean).join('\n'),
    };
  }

  function extractSlack() {
    const url = window.location.href;
    const channelName = document.querySelector('[data-qa="channel_name"]')
      ?.textContent?.trim() || document.title.split('|')[0].trim();
    const messages = [...document.querySelectorAll('[data-qa="message_content"], .c-message__body')]
      .slice(0, 30).map(el => {
        const msgEl = el.closest('[data-qa="message_container"], .c-message');
        const author = msgEl?.querySelector('[data-qa="message_sender_name"]')?.textContent?.trim() || 'unknown';
        const ts = msgEl?.querySelector('[data-qa="timestamp"]')?.getAttribute('data-ts');
        const time = ts ? new Date(parseFloat(ts) * 1000).toISOString() : '';
        const text = el.innerText?.trim() || '';
        return text ? `[${author} @ ${time}]: ${text}` : null;
      }).filter(Boolean);

    return {
      pageType: 'slack_channel', source: 'slack', channel: channelName,
      title: `Slack #${channelName} — messages`, url, messageCount: messages.length,
      text: [`# Slack Channel: #${channelName}`, `URL: ${url}`, '', ...messages].join('\n'),
    };
  }

  function extractNotion() {
    const url = window.location.href;
    const title = document.querySelector('[placeholder="Untitled"], h1.notion-page-title')
      ?.textContent?.trim() || document.title.replace(' - Notion', '').trim();
    const bodyText = document.querySelector('[class*="page-body"], main')?.innerText?.trim() || '';
    return {
      pageType: 'notion_page', source: 'notion', title, url,
      text: [`# ${title}`, `URL: ${url}`, '', bodyText].join('\n'),
    };
  }

  function extractPageData(pageType) {
    try {
      if (pageType.startsWith('github_')) return extractGitHub();
      if (pageType === 'linear_issue')    return extractLinear();
      if (pageType === 'slack_channel')   return extractSlack();
      if (pageType.startsWith('notion_')) return extractNotion();
    } catch (err) {
      return { error: err.message, pageType, url: window.location.href };
    }
    return null;
  }

  function notifyBackground(pageType, data) {
    try {
      chrome.runtime.sendMessage({
        type: 'hydrabrain_page_detected',
        pageType,
        title:  data.title || document.title,
        source: data.source,
        url:    window.location.href,
        hasData: true,
      });
    } catch { /* Extension context invalidated */ }
  }

  // Detect and notify on page load
  const pageType = detectPageType(window.location.href);
  if (pageType) {
    const data = extractPageData(pageType);
    if (data && !data.error) notifyBackground(pageType, data);
  }

  // Handle explicit sync/detect requests from background
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'hydrabrain_sync_request') {
      const pt = detectPageType(window.location.href);
      if (!pt) { sendResponse({ success: false, error: 'Page type not supported.' }); return true; }
      const d = extractPageData(pt);
      if (!d) { sendResponse({ success: false, error: 'Extraction failed.' }); return true; }
      sendResponse({ success: true, ...d });
      return true;
    }
    if (msg.type === 'hydrabrain_detect_page') {
      const pt = detectPageType(window.location.href);
      sendResponse({ pageType: pt, url: window.location.href, title: document.title, supported: !!pt });
      return true;
    }
  });

  // SPA navigation watcher
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const cur = window.location.href;
    if (cur !== lastUrl) {
      lastUrl = cur;
      const newType = detectPageType(cur);
      if (newType) {
        setTimeout(() => {
          const newData = extractPageData(newType);
          if (newData && !newData.error) notifyBackground(newType, newData);
        }, 1500);
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

}());
