# Rubber Duck's Cloudy Adventure - A Story for Young Children

Main Character: Sunny the Yellow Rubber Duck

## Plot Summary

Sunny the duck loves floating in his little pond under the big sky. One day, a strong wind blows and carries him up into the clouds! The game follows Sunny's gentle adventure through the sky.

## Scenes/Scenarios

### 0 - Start scene (Current Implementation)

Sunny floats peacefully in his pond (static duck model)
Clouds move slowly across the sky (existing cloud system)
Player clicks "START" to begin the adventure (existing camera zoom)

### 1 - The Calm Pond

The dialogue bubble is displayed over the duck saying: "Привет! Как по мне, погода сегодня слишком облачная. Нажимай на облака чтобы они исчезли."
The clouds become clickable. On mouse over the cloud are highlighted with a darker color. Clicking on the cloud makes it disappear. After the player clicks 10 clouds, the duck says: "Теперь мне слишком жарко! Давай плескаться! Нажимай на пруд чтобы летели брызги."

### 2 - Splash in the water

The pond becomes clickable. On mouse over it is highlighted with a darker color. Clicking on the pond makes a splash. The bubble text is updated to "Давай плескаться: 1 из 10". With every splash the clouds become darker. After 10 splashes the  duck says "Ой ой" and the strong wind blows it away. The animation includes a tornado represented by an upside-down cone with a shader. The animation shows tornado passing from the side of the screen directly to the duck, then the duck flies up with the camera together.

### 3 - Up in the Clouds

Camera shows Sunny floating among the clouds
Simple interaction: Tap clouds to make them change shape
Educational element: Count the clouds (1-5) as they pass by

### 4 - The Rain Shower

Darker skybox with raindrops (could be simple particle effects)
Interaction: Tap Sunny to make him quack happily in the rain
Learning: Cause/effect - rain makes puddles below

### 5 - The Rainbow Bridge

Skybox changes to show a rainbow
Interaction: Drag finger to help Sunny slide down the rainbow
Color recognition: Name the rainbow colors as Sunny passes them

### 6 - Back Home

Camera returns to original view (reverse of START animation)
Sunny is back in his pond, story comes full circle
Interaction: Tap Sunny to hear a happy quack
Suggested Simple Interactions to Add:

- Tap the duck to make it quack
- Tap clouds to change their shapes
- Simple drag/swipe to move duck slightly
- Counting elements (clouds, raindrops)
- Color recognition with rainbow
- Cause/effect reactions (rain makes puddles)

Educational Benefits:

- Basic counting (1-5)
- Color recognition
- Cause and effect understanding
- Simple motor skills (tapping, dragging)
- Story sequencing

The story maintains simplicity for young children while providing multiple avenues for gentle interaction and learning opportunities that could be implemented gradually.
