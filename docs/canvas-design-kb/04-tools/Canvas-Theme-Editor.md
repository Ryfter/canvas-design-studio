# Canvas Theme Editor

> **Parent:** [[../README]] | **Related:** [[../01-canvas-rce/CSS-Inline-Strategy]], [[../04-tools/DesignPLUS-Overview]]
>
> **Official Guide:** [How do I upload custom JS and CSS to an account? — Instructure Community](https://community.canvaslms.com/t5/Admin-Guide/How-do-I-upload-custom-JavaScript-and-CSS-files-to-an/ta-p/253)

---

## What Is It?

The Canvas Theme Editor is an **admin-level tool** that allows Canvas administrators to inject custom CSS and JavaScript across all courses in an account (or sub-account). This is how DesignPLUS and similar tools extend Canvas beyond RCE limitations.

---

## What It Enables (That RCE Cannot)

| Feature | Via RCE | Via Theme Editor CSS/JS |
|---|---|---|
| `box-shadow` | ❌ | ✅ Via CSS class |
| Web fonts | ❌ | ✅ Via `@import` or `@font-face` |
| CSS animations | ❌ | ✅ Via CSS class |
| JavaScript interactions | ❌ | ✅ Via account JS |
| Global nav customization | ❌ | ✅ |
| Institution-wide CSS classes | ❌ | ✅ |

---

## How Instructors Benefit Without Admin Access

If your Canvas admin has added CSS classes via the Theme Editor, you can use those class names in your `class=""` attributes in the RCE HTML. Example:

If admin CSS defines:
```css
.callout-box {
  border-left: 4px solid #0F6E56;
  background: #e1f5ee;
  padding: 14px 18px;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}
```

Then in RCE HTML you can write:
```html
<div class="callout-box">
  Your content here.
</div>
```

The `box-shadow` and other non-allowed inline properties work because they're defined at the account level, not in the RCE content.

**Action:** Talk to your Canvas admin about what (if any) institutional CSS classes exist that you can use.

---

## DesignPLUS and the Theme Editor

DesignPLUS works entirely through Theme Editor-level injection:
- Its CSS provides the styled classes that its HTML references
- Its JavaScript powers interactive elements (tabs, accordions, flip cards)
- This is why DesignPLUS can do things no amount of inline CSS can replicate

---

## Requesting Admin CSS

If you're not an admin, you can request that specific CSS classes be added to your institution's theme. Build a case by:
1. Documenting which CSS property you need and why
2. Showing the specific use case (e.g., "box-shadow on cards improves visual hierarchy")
3. Providing the exact CSS you want added, scoped to a class name
4. Submitting a Canvas Feature/Support request or emailing your Canvas admin team

---

## See Also

- [[../01-canvas-rce/CSS-Inline-Strategy]] — What you can do without admin access
- [[../04-tools/DesignPLUS-Overview]] — How DesignPLUS uses Theme Editor capabilities
