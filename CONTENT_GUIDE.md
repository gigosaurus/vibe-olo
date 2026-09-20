# Writing cards for Party Deck

This is the tone and safety guide for anyone adding card content. Read it before
writing; `src/game/cards/content.test.ts` enforces the mechanical parts, but the
judgement calls are yours.

## Who is playing

A mixed group of adult friends, in a living room or around a table, sharing one
phone. Some of them are drinking, some are not, and the deck cannot tell which is
which. At least one person in the room did not choose to play and is being
polite about it. Write for that person too.

## Tone

- **Playful, not crude.** Cheeky is good. Mean is not.
- **Short.** A card is read aloud from arm's length. Aim for one or two
  sentences and no more than 160 characters.
- **Doable right now.** Sitting down, indoors, with no props beyond what is on
  the table and no preparation.
- **Inclusive by default.** No assumptions about relationship status, gender,
  body, income, religion or nationality. Do not write a card that only works for
  people who have a partner, a car or a job.
- **Aimed at the group, not at one person's expense.** Teasing is fine when the
  target can join in. Ridicule is not.
- **Plain English.** No in-jokes, no references that date quickly.

## Hard limits

Never write a card that does any of the following:

- Pressures anyone to drink, or implies that drinking is expected.
- Names a quantity: no shots, chugging, finishing a glass or "three sips".
- Punishes a skip. Skipping is free, always, and no card may say otherwise.
- Involves anything physically risky: no running, climbing, standing on
  furniture, holding your breath, blindfolds or anything with heat or glass.
- Touches driving, or any activity where alcohol makes it dangerous.
- Involves sexual pressure, unwanted touching, kissing dares, or anything that
  needs consent the card cannot check for.
- Harasses, discriminates against, outs, or targets anybody, including people
  not in the room.
- Encourages anything illegal.
- Makes a medical or health claim, including jokes about hangover cures.

## Drinking wording

- The default phrasing is **optional**: "may take a sip", "can take a sip if they
  want". Never "take a sip", "drink", or "must".
- A card that mentions a drink must set `alcoholFree: false` and provide
  `alcoholFreeText`. If it pins a rule, provide `alcoholFreeRule` too.
- The alcohol-free replacement must be a real substitute, not a punishment:
  a point that cannot be spent, a pose, a round of applause, an extra question.
  It must not mention drinking at all.
- Alcohol-free mode is not a lesser mode. A card should be just as fun in it.

## Matching the card type

| Audience     | What it looks like                      | Must contain                |
| ------------ | --------------------------------------- | --------------------------- |
| `individual` | One person acts or answers.             | `{player}`                  |
| `pair`       | Two named people do something together. | `{player}`, `{otherPlayer}` |
| `vote`       | The group points at someone on three.   | `{playerList}`              |
| `group`      | Everyone at once.                       | nothing required            |
| `rule`       | Creates a temporary rule.               | a short `rule` line         |

Notes:

- `{otherPlayer}` only makes sense alongside `{player}`.
- A `group` card may still name one person with `{player}` — the engine gives it
  a turn holder.
- A `rule` line is pinned to the top of the screen until somebody removes it, so
  it must be under about eight words and make sense without the card that
  created it.
- Set `duration` only when the card genuinely needs a time box, and keep it
  between 5 and 60 seconds.

## Intensity levels

- **Relaxed** — safe for the first ten minutes, for a group that has not met
  before, or for people who are not drinking. Nothing embarrassing.
- **Standard** — mild embarrassment, mild confession, performing in front of
  friends. The bulk of the deck.
- **Chaotic** — loud, silly, more revealing. Still never crosses a hard limit;
  "chaotic" means energy, not risk.

Remember that intensity is cumulative: a Chaotic game still deals Relaxed cards,
so the levels need to work next to each other.

## A quick self-check

Before you commit a card, ask:

1. Could the quietest person in the room do this without dreading it?
2. Does it work for someone drinking water?
3. Would it still be funny read out by a stranger?
4. Is anyone the butt of it who did not opt in?
5. Does it survive `npm run test`?

If any answer is wrong, rewrite it rather than softening it.
