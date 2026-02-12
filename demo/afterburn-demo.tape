# afterburn-demo.tape
# Usage: vhs demo/afterburn-demo.tape
# Produces: demo/afterburn-demo.gif

Output demo/afterburn-demo.gif

Set Shell "bash"
Set FontSize 20
Set FontFamily "Consolas"
Set Width 960
Set Height 540
Set Padding 20
Set LineHeight 1.3
Set Framerate 12
Set Theme "Dracula"
Set WindowBar Colorful
Set BorderRadius 8
Set CursorBlink false
Set TypingSpeed 30ms

# Initial frame - blank terminal visible briefly
Sleep 500ms

# Type the command the user would run (visible on first frame after typing)
Type "npx afterburn https://myapp.dev"
Sleep 800ms

# Hide the real Enter so viewer doesn't see we swap to mock
Hide
Enter
Sleep 200ms
Type "clear && bash demo/mock-scan.sh"
Enter
Show

# Wait for mock output to complete (total mock runtime ~6s)
Sleep 6s

# Linger on final results so viewer can absorb
Sleep 3s
