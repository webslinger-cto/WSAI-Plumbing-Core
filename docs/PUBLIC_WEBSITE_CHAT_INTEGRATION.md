# Public Website Chat Button Integration

## Overview

Add a chat button to your public-facing website (EmergencyChicagoSewerExperts.replit.app) that opens the CRM chat interface.

## CRM Chat URL

```
https://chicagosewerexpertsapp.com/chat
```

## Option 1: Floating Chat Button (Recommended)

Add this code to your public website's layout or main component:

```jsx
// FloatingChatButton.tsx
import { MessageCircle } from 'lucide-react';

export function FloatingChatButton() {
  const handleChatClick = () => {
    window.open('https://chicagosewerexpertsapp.com/chat', '_blank', 'width=400,height=600');
  };

  return (
    <button
      onClick={handleChatClick}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
      aria-label="Chat with us"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="font-medium">Chat Now</span>
    </button>
  );
}
```

## Option 2: Simple HTML/CSS Button

If your public website uses plain HTML:

```html
<!-- Add before closing </body> tag -->
<style>
  .chat-button {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 8px;
    background-color: #dc2626;
    color: white;
    padding: 12px 20px;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    font-weight: 500;
    font-size: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.2s ease;
  }
  .chat-button:hover {
    background-color: #b91c1c;
    transform: scale(1.05);
  }
  .chat-button svg {
    width: 20px;
    height: 20px;
  }
</style>

<button class="chat-button" onclick="openChat()">
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
  Chat Now
</button>

<script>
  function openChat() {
    window.open('https://chicagosewerexpertsapp.com/chat', 'ChatWindow', 'width=400,height=600,scrollbars=yes');
  }
</script>
```

## Option 3: Link in Navigation or Footer

Add a simple link anywhere on your site:

```html
<a href="https://chicagosewerexpertsapp.com/chat" target="_blank" class="chat-link">
  Chat with Us
</a>
```

## Option 4: Emergency Banner with Chat

```html
<div style="background: #dc2626; color: white; padding: 12px; text-align: center;">
  <strong>Need Emergency Help?</strong> 
  Call <a href="tel:+1234567890" style="color: white; text-decoration: underline;">123-456-7890</a> 
  or <a href="https://chicagosewerexpertsapp.com/chat" target="_blank" style="color: white; text-decoration: underline; font-weight: bold;">Chat Now</a>
</div>
```

## How It Works

1. Customer clicks the chat button on your public website
2. A new window/tab opens to the CRM chat page
3. Customer fills out their name, phone, and message
4. A lead is automatically created in your CRM
5. Dispatchers see the incoming chat immediately
6. Customer can continue chatting in real-time

## Notes

- The chat opens in a popup window (400x600) for a focused experience
- Alternatively, use `target="_blank"` to open in a new tab
- The CRM handles all session management - no cookies needed on your public site
- Works on mobile devices (popup becomes a new tab)
