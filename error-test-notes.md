# Error State Test Notes

The DOM shows "✕ ACCESS DENIED — INVALID KEY" in the element list (element 1 text includes it).
However, the error text is not visible in the screenshot - it's likely too small or the opacity transition isn't working properly.

The error div uses opacity: keyError ? 1 : 0 - the issue might be that the React state update
from the button click isn't being captured by the screenshot timing.

Looking at the screenshots more carefully, the text IS in the DOM but may be hidden below the input.
The error is at fontSize: 12 with color #ff3333 - it should be visible on the black background.

Need to check: is the error message being rendered but clipped or overlapped by other elements?
