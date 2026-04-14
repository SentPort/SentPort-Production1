/*
  # Seed Blog Posts - Part 1 (Users 1-50)

  Seeds 2-3 realistic blog posts per user for the first 50 seed test accounts.
  Posts cover diverse topics: technology, travel, culture, personal essays,
  science, food, art, and more. All posts are published and public.
*/

INSERT INTO blog_posts (id, account_id, title, content, privacy, status, word_count, estimated_read_minutes, tags, published_at, created_at, view_count, like_count, total_reaction_count, is_draft, is_pinned, comment_count, moderation_status)
VALUES

-- James Hartwell (a1000001) - tech writer
(gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001',
 'Why I Stopped Using Social Media for 30 Days (And What Happened)',
 'It started as a dare from a colleague. Thirty days without Instagram, Twitter, or any social platform. I figured I would last a week. I lasted the full month, and what I discovered changed how I think about attention, creativity, and connection.

The first three days were the hardest. My thumb would instinctively navigate toward the app icons before I caught myself. I estimated I was reaching for my phone around 80 times a day—not counting actual calls or texts. That number alone was alarming.

By day seven, something shifted. I started finishing books again. I read three novels in the first two weeks, which is more than I had read in the previous six months combined. My sleep improved dramatically. Without the blue-light scroll session before bed, I was falling asleep within minutes rather than the usual hour of restless scrolling.

The creative output surprised me most. I filled half a notebook with ideas—some half-formed, some genuinely exciting. When your brain is not constantly processing other people''s content, it starts generating its own. I had forgotten what that felt like.

What I missed: the serendipitous discovery of interesting people. The occasional brilliant thread. The feeling of being connected to a broader conversation. These are real. But I had confused a small genuine value with a massive time commitment.

I came back with rules. Specific windows. No phone in the bedroom. It has stayed manageable for eight months now.',
 'public', 'published', 280, 2, ARRAY['digital-wellness','productivity','mindfulness'], NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', 847, 124, 156, false, false, 18, 'approved'),

(gen_random_uuid(), 'a1000001-0000-0000-0000-000000000001',
 'The Case for Boring Technology in Your Personal Life',
 'I run a spreadsheet to track my budget. A paper notebook for daily tasks. Email for most communication. My friends call it retro. I call it effective.

We live in an era of constant tool churn. Every six months there is a new productivity system, a new note-taking app that will finally unlock your potential, a new framework for thinking about time. I have tried most of them. None of them were the bottleneck.

The real bottleneck is almost always discipline, clarity of priorities, or having too much to do—not the software you use to organize it.

Boring technology has a profound advantage: you stop thinking about the tool and start doing the work. A spreadsheet you have used for three years contains no surprises. You do not spend cognitive energy learning it, customizing it, or migrating data when the company pivots.

There is also a resilience argument. Paper does not require a subscription. It does not sunset. Your notes from 2015 are still readable. Can you say the same for whatever app you were using then?

I am not anti-technology. I am pro-intentionality. When I adopt a new tool, I ask: is this solving a real problem I have right now, or am I just excited about the novelty? Usually it is the latter. Usually I do not install it.',
 'public', 'published', 240, 2, ARRAY['technology','productivity','minimalism'], NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 612, 98, 115, false, false, 12, 'approved'),

-- Sofia Mendez (a1000002) - travel/culture
(gen_random_uuid(), 'a1000002-0000-0000-0000-000000000002',
 'Six Months in Southeast Asia: What Nobody Tells You',
 'Every travel blog will tell you about the sunsets in Bali, the street food in Bangkok, the temples in Angkor Wat. They are right about all of it. But six months of slow travel teaches you things the highlight reels skip entirely.

The loneliness is real. Not all the time, and not crippling—but there are Tuesday evenings in a guesthouse in a city where you do not speak the language and the novelty has temporarily worn off, and you feel it. The trick is learning to be comfortable with it rather than running from it by booking the next overnight bus.

Your spending habits reveal everything about you. The budget traveler who refuses to spend $3 on a tuk-tuk out of principle but drops $80 on a "once in a lifetime" cooking class. The constant calculations. After a while you understand which comforts actually matter to you and which you were pursuing out of habit or status.

Locals are endlessly patient with confused foreigners, but you will embarrass yourself anyway. I mispronounced a Thai greeting so badly that the woman I was addressing thought I was asking about her restaurant''s bathroom. She found this delightful. These moments are the real education.

Slow travel—staying somewhere for three or four weeks instead of three or four days—is incomparably better. You start to see the same faces. You have a "regular" coffee place. You stop being a tourist and start just... being somewhere.',
 'public', 'published', 290, 2, ARRAY['travel','southeast-asia','slow-travel'], NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days', 1203, 187, 231, false, false, 34, 'approved'),

(gen_random_uuid(), 'a1000002-0000-0000-0000-000000000002',
 'Learning to Cook My Grandmother''s Recipes After She Was Gone',
 'My grandmother never wrote down a recipe in her life. Everything was "a handful of this" and "cook until it looks right" and "you will know when it is done." For fifty years her kitchen produced the best food I have ever eaten. When she died, I realized I had never once watched carefully enough.

The project of reconstruction started with phone calls to aunts and cousins scattered across three countries. Everyone remembered different things. My Tía Rosa was certain there was cumin in the mole. My cousin Diego was equally certain there was not. We were both probably remembering different versions from different decades.

I cooked the same dish twelve times over three months. The first attempts were technically correct but spiritually empty. Too precise, too measured. My grandmother cooked by feel and memory and mood. Trying to replicate her food with a kitchen scale was like trying to copy a painting by measuring the brush strokes.

The twelfth attempt tasted like something. Not exactly like her kitchen—I am not sure that is possible—but like a conversation with her memory. My mother tasted it and went quiet for a moment. That silence was the best review I have ever received.

Food is not just flavor. It is the accumulated weight of who made it and who ate it and what was said at the table. You cannot separate the recipe from the history. Sometimes in trying to recover one, you recover the other.',
 'public', 'published', 270, 2, ARRAY['food','family','culture','memory'], NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 934, 201, 248, false, false, 41, 'approved'),

-- Liam O'Connor (a1000003) - philosophy/essays
(gen_random_uuid(), 'a1000003-0000-0000-0000-000000000003',
 'On the Quiet Dignity of Doing One Thing Well',
 'There is a cobbler two streets from where I grew up who has repaired shoes in the same shop for over forty years. The same bench, the same tools, the same careful attention to leather and sole and stitch. He is not famous. He will not be written about. But every pair of shoes that passes through his hands leaves better than it arrived.

We live in an age that celebrates disruption, scale, and visibility. The cobbler represents something our culture has quietly devalued: the sustained mastery of a single craft practiced with integrity over a lifetime.

This is not nostalgia for a simpler time. Every era has had its cobblers and its conquerors, its quiet craftspeople and its visible strivers. But the balance of cultural celebration has shifted so heavily toward scale and novelty that we have stopped noticing what is lost.

What the cobbler has—and what I increasingly think constitutes a form of freedom—is clarity. He knows what he is doing and why. His measure of a good day is uncomplicated: did the work meet the standard? The endless modern negotiation between what I want to do and what will perform well online, between authentic expression and audience expectation, between depth and reach—none of that exists in his shop.

I am not suggesting everyone should become a cobbler. I am suggesting we look more honestly at what we are trading away when we optimize everything for growth and visibility.',
 'public', 'published', 260, 2, ARRAY['philosophy','craft','modern-life'], NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', 718, 145, 167, false, false, 22, 'approved'),

(gen_random_uuid(), 'a1000003-0000-0000-0000-000000000003',
 'Reading 100 Books in a Year: What I Actually Learned',
 'I set the goal partly for the bragging rights, I will admit. A hundred books in a year sounds impressive at dinner parties. But the experience taught me things I did not expect, and some of them were uncomfortable.

The first thing I learned is that reading fast and reading well are different skills that frequently conflict. To hit the number, I skimmed. I skipped descriptions I should have savored. I tracked completion instead of comprehension. By book fifty I was technically reading more than I ever had and intellectually absorbing less.

Around book sixty I stopped tracking and just read. I slowed down. I reread pages that confused me. I sat with endings before moving on. I ended the year having "finished" around seventy-five books by my original count—but I remembered more of them. I had opinions about them. They had changed how I thought about specific things.

The second thing I learned is that quantity creates strange effects on taste. Reading across so many genres and styles in a single year, I developed instinctive pattern recognition for the moves writers make. The opening that establishes stakes. The false resolution two-thirds through. The character who exists only to deliver exposition. Seeing these structures repeatedly made me simultaneously more critical and more forgiving.

The third thing: the best books I read were recommended by people who knew me. Not by algorithms. Not by bestseller lists. By friends who said "this is for you specifically."',
 'public', 'published', 265, 2, ARRAY['books','reading','learning'], NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 889, 156, 178, false, false, 27, 'approved'),

-- Priya Sharma (a1000004) - science/tech
(gen_random_uuid(), 'a1000004-0000-0000-0000-000000000004',
 'What Working in Biotech Taught Me About Failure',
 'In biotech, most things do not work. This is not a problem with the industry; it is the nature of trying to do things that have never been done before. The compound that showed promise in the mouse model fails in humans. The protein that folds correctly in silico does not behave in the wet lab. The clinical trial that cost three hundred million dollars ends with a press release nobody wanted to write.

I spent five years in drug discovery before moving to science communication, and the most important thing I learned was how to be wrong productively. There is a difference between an experiment that fails and an experiment that teaches. The difference is almost entirely in how you design it and how you interpret the data you get.

Good scientists in my experience are distinguished less by brilliance than by their relationship to negative results. The brilliant researcher who crumbles at contradictory data is far less valuable than the merely competent one who treats a failed experiment as a question that got answered—just not the way we hoped.

This sounds obvious when written down. It is genuinely difficult in practice. Grant cycles create pressure to show progress. Publication bias means negative results often go unpublished. The incentive structures push toward confirming hypotheses rather than testing them rigorously.

What I carry from that work: ask the experiment a question it can actually answer. Design the control that disproves you if you are wrong. Then let the data speak, even when it says something inconvenient.',
 'public', 'published', 275, 2, ARRAY['science','biotech','failure','learning'], NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', 756, 132, 148, false, false, 19, 'approved'),

(gen_random_uuid(), 'a1000004-0000-0000-0000-000000000004',
 'The Scientists Who Changed How I Think About Time',
 'Most people experience time as a river—flowing in one direction at a constant rate. Physics has known for over a century that this is wrong. Time passes faster at altitude than at sea level. It slows near massive objects. Two atomic clocks separated by thirty centimeters tick at measurably different rates.

I first encountered this properly not in a physics class but in a biography of the team that built the GPS system, who had to account for relativistic time dilation to make the whole thing work. If they had ignored Einstein, your GPS would accumulate errors of about eleven kilometers per day.

The philosopher who changed my intuition most was not a physicist but McTaggart, who argued in 1908 that time as we experience it is fundamentally unreal—that our sense of "now" is a property of minds, not of the universe. I do not know if he was right. But sitting with that possibility for a few weeks restructured how I thought about urgency, regret, and the permanence of the past.

What I find most useful practically: the past is fixed. Every moment that has existed still exists, in the sense that it happened and cannot unhappen. The meal you ate with your grandmother twenty years ago is permanent in a way that feels underappreciated. It will always have happened. That is strange and, I think, comforting.',
 'public', 'published', 255, 2, ARRAY['physics','time','philosophy','science'], NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', 678, 118, 134, false, false, 16, 'approved'),

-- Ethan Brooks (a1000005) - sports/fitness
(gen_random_uuid(), 'a1000005-0000-0000-0000-000000000005',
 'Training for My First Marathon at 34: A Brutally Honest Account',
 'Week one: I ran four miles and thought I was dying. My left knee felt like it was being repaired with a staple gun. I sat in the bathtub for forty minutes afterward and seriously reconsidered the whole thing.

Week twelve: I ran eighteen miles on a Saturday morning and finished feeling tired but not destroyed. Something had changed in my body and my relationship to discomfort that I did not fully understand.

The training plan I followed was supposed to take sixteen weeks. It took me twenty-two. I had two minor injuries—an IT band flare and a stress reaction in my right foot—and took a full week off for each. This is not in the inspirational running content. It is what actually happens to most recreational runners training for their first marathon.

What nobody tells you about marathon training: your social life takes a hit. Long runs on Saturday mornings mean Friday nights end at ten. Your family will politely support you while privately wondering when this phase ends. You will eat more than you ever have and still feel hungry.

What makes it worth it: somewhere around mile sixteen of the actual race, when your legs are leaden and your feet hurt and the finish line is still over an hour away, you are forced to have a direct conversation with yourself about who you are and what you are actually capable of. I liked what I found out.',
 'public', 'published', 270, 2, ARRAY['running','fitness','marathon','personal'], NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', 1089, 213, 267, false, false, 45, 'approved'),

(gen_random_uuid(), 'a1000005-0000-0000-0000-000000000005',
 'Cold Showers: Six Months In, Here Is the Truth',
 'Every few years cold shower evangelism surges through the wellness internet. Wim Hof has been involved in most recent surges. The claims range from the reasonable (alertness, improved circulation) to the ambitious (cures depression, extends life, activates ancient warrior DNA or something).

I started cold showers six months ago because my gym was running out of hot water and I got tired of the buildup to the cold. Eventually I just started going straight to cold.

What actually happened: I am more alert in the mornings. This is real and immediate and I no longer question it. Cold water activates the sympathetic nervous system faster than coffee. Whether this is "good for you" physiologically in some deeper sense, I genuinely do not know.

The mental benefits people talk about—building resilience, learning to embrace discomfort—feel plausible to me but are hard to isolate. I am generally someone who can tolerate discomfort well. Did the showers make me better at this? Maybe marginally.

The honest verdict: cold showers are fine and probably mildly beneficial. The community around them has produced a level of fervor that is comically disproportionate to what is essentially just getting wet with cold water. Do it if you want. Do not expect transformation.',
 'public', 'published', 240, 2, ARRAY['health','wellness','habits'], NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', 542, 87, 103, false, false, 14, 'approved'),

-- Amara Okafor (a1000006) - art/culture
(gen_random_uuid(), 'a1000006-0000-0000-0000-000000000006',
 'Why African Contemporary Art is Having Its Moment—And Why That Is Complicated',
 'The past decade has seen an explosion of global interest in contemporary African art. Auction records broken. Museum acquisitions accelerating. Artists who could not get gallery representation in Lagos now have solo shows in London and New York. By any objective measure, this is a good thing.

But spend time in the Lagos art scene and you will hear a more complicated conversation. Who benefits from this attention? Who is doing the curating? When a Western institution "discovers" an African artist, what narrative framework are they placing that work inside?

The artist Njideka Akunyili Crosby—whose works now sell for millions—has spoken about the strange experience of having her work celebrated abroad for its "African-ness" while that same work is, at its core, about the very specific experience of living between cultures. The reduction of complexity to origin is one of the subtler forms of misreading.

I want to be careful here not to fall into the trap of purity politics where no Western engagement with African art can be legitimate. That is both wrong and counterproductive. Collectors buy what moves them. Institutions acquire what they believe has cultural importance. The motivations are often genuine.

The more useful question is whether the infrastructure—the galleries, the critics, the institutional frameworks—is being built in Africa as well as around African artists abroad. A boom that primarily enriches a handful of individuals while the ecosystem remains thin has limited reach. The more interesting story is happening in Accra, Nairobi, and Lagos itself.',
 'public', 'published', 285, 2, ARRAY['art','africa','culture','contemporary-art'], NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days', 867, 143, 172, false, false, 28, 'approved'),

(gen_random_uuid(), 'a1000006-0000-0000-0000-000000000006',
 'On Learning to Draw at 28: Absolute Beginner Notes',
 'I had convinced myself I was not a visual person. Not creative in that way. It was a story I had been telling myself since a primary school art teacher told my class our drawings were "imaginative" in a tone that clearly meant something else. Twenty years of this story, and I had never questioned it.

Then a lockdown, too much time, and a sketchbook bought on a whim.

The first month was humbling in a way I had not experienced since learning to drive. I could not draw a straight line. My proportions were laughably wrong. I drew my own hand six times and each attempt looked like something dredged from a fever dream.

But I kept going, mostly because I had nothing else to do, and around week six something shifted. My eyes started working differently. I was not drawing what I thought an object looked like; I was drawing what I actually saw. The object as a collection of values and angles and relationships rather than a symbol.

This is the central insight of learning to draw that I had never heard explained clearly: you are not learning a physical skill. You are learning to see. Your hand will follow your eyes once your eyes are doing the right job.

Eighteen months later I would not call myself good. But I am genuinely not bad, and the story about not being a visual person has been retired permanently.',
 'public', 'published', 255, 2, ARRAY['art','drawing','creativity','learning'], NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', 723, 167, 198, false, false, 31, 'approved'),

-- Noah Fischer (a1000007) - music/culture
(gen_random_uuid(), 'a1000007-0000-0000-0000-000000000007',
 'What Jazz Taught Me About Listening',
 'I grew up on rock and pop. My father was a jazz fan who occasionally played records in the evenings, and I treated this as background noise until I was about twenty-two, when a friend dragged me to a small club in Berlin to see a pianist whose name I did not recognize. By the end of the first set I understood that I had been missing something for two decades.

Jazz requires a different kind of attention than most Western popular music. In a pop song, your ear is guided. Melodies repeat. Hooks pull you forward. The structure is designed to minimize the cognitive work of listening. Jazz, particularly the more adventurous post-bop variety, asks you to do some of the work yourself.

The experience of genuinely listening to Miles Davis''s Kind of Blue for the first time—not having it on while you clean—is the experience of noticing how each instrument creates space for the others. How a solo emerges from a conversation rather than a monologue. How the rhythm section does not just keep time but sculpts it.

The music changed how I listen to everything else. I notice bass lines I had never noticed. I hear arrangements as decisions. I start to understand when a song is doing something interesting versus when it is competently executing a formula.

More unexpectedly, it changed how I listen to people. The jazz vocabulary of call and response, of creating space, of following rather than always leading—it is a good model for conversation too.',
 'public', 'published', 270, 2, ARRAY['music','jazz','listening','culture'], NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days', 654, 127, 146, false, false, 21, 'approved'),

-- Chloe Dupont (a1000008) - fashion/lifestyle
(gen_random_uuid(), 'a1000008-0000-0000-0000-000000000008',
 'A Year of Buying Nothing New: Fashion Edition',
 'The challenge seemed simple: twelve months, no new clothing purchases. Secondhand only. Or wear what I already owned. I am a fashion editor. This was professionally complicated.

Month one: I realised how much I had been buying on autopilot. A pair of earrings here, a cardigan there—small purchases that did not feel significant until I could not make them. I tallied what I would have spent in a typical month. The number was embarrassing.

Month three: I had made three genuinely exciting secondhand finds. A 1970s Yves Saint Laurent blouse in my exact size from an estate sale. A pair of perfectly worn leather boots that needed only resoling. A Japanese denim jacket that cost twelve euros at a market in Lyon and is now my most-worn piece.

The interesting professional discovery: secondhand forces you to be a better editor of your own wardrobe. You cannot buy the trendy thing on impulse because the trendy thing is not available used yet—it was made two months ago. You have to work with what exists, which pulls you toward quality, construction, and timelessness over novelty.

Month twelve: my wardrobe is smaller, better, and more distinctively mine than it has ever been. I have started photographing pieces before buying them to ask honestly: does this fill a gap, or am I just excited about the find? The question works in both directions.',
 'public', 'published', 265, 2, ARRAY['fashion','sustainability','secondhand','lifestyle'], NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days', 912, 178, 215, false, false, 36, 'approved'),

-- Rafael Santos (a1000009) - photography/travel
(gen_random_uuid(), 'a1000009-0000-0000-0000-000000000009',
 'Film Photography in 2024: Why I Switched Back',
 'I shot digital for twelve years. Started with a Canon DSLR, moved to mirrorless, accumulated lenses, storage drives, and the creeping anxiety of a library containing 80,000 RAW files that I would never fully process. Then I bought a used Nikon FM2 for 60 euros at a market in Porto, put a roll of Kodak Portra in it, and everything changed.

Film costs you. Thirty-six exposures on a roll, each one costing roughly a euro once you factor in film and development. You think before you shoot. You look at light differently. You frame more carefully because you are not going to take fifteen brackets and pick the best in Lightroom.

The limitation creates presence. With a digital camera, the experience of photography can become primarily post-processing—you are hunting for the raw material that will make a good edit. With film, the image is fixed in the camera, in the moment. What you saw and felt when you pressed the shutter is largely what you get back. This changes your relationship to the act of seeing.

The results are different in ways that are genuinely hard to describe without sounding precious. There is grain. There is a color rendering that still surpasses most digital processing at the same cost. There is a physicality to the negative that I find meaningful in a way I did not expect.

I still shoot digital for work. But every personal project for the past two years has been film. I am not going back.',
 'public', 'published', 260, 2, ARRAY['photography','film','analog'], NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days', 798, 152, 183, false, false, 29, 'approved'),

-- Mei Lin (a1000010) - food/culture
(gen_random_uuid(), 'a1000010-0000-0000-0000-000000000010',
 'The Politics of Chinese Food in the West',
 'When my parents opened their restaurant in Manchester in 1993, they made a decision: serve the dishes that British customers expected, not the food they actually ate at home. Sweet and sour pork. Chow mein. Spring rolls with the texture of American fast food. It was a pragmatic choice, and it kept the family fed.

The gap between restaurant Chinese food and domestic Chinese food is one of the more peculiar features of the Western culinary landscape. The former was shaped by decades of economic necessity and cultural adaptation; the latter is as regional, complex, and contested as any European cuisine.

The recent visibility of "authentic" regional Chinese cooking—Sichuan peppercorn heat, hand-pulled noodles, soup dumplings with their specific geometry of folds—represents something more than culinary fashion. It is, in part, Chinese-heritage cooks reclaiming the right to present their actual culture rather than the version that was commercially palatable to a previous generation.

My mother has complicated feelings about this. On one hand she is proud that her children do not have to make the compromises she made. On the other hand, the dishes she adapted—cooked with real care and quality ingredients—fed our family and became part of our story. Are they less legitimate because they were shaped by economic pressure?

Food, like language, adapts to its context. Adaptation is not always betrayal. The question is whether the adaptation is chosen or forced.',
 'public', 'published', 275, 2, ARRAY['food','culture','chinese-food','identity'], NOW() - INTERVAL '48 days', NOW() - INTERVAL '48 days', 876, 165, 201, false, false, 33, 'approved'),

-- Oliver Watts (a1000011) - technology/startups
(gen_random_uuid(), 'a1000011-0000-0000-0000-000000000011',
 'What Three Failed Startups Taught Me About Starting Up',
 'The first one died because we built something no one needed. We were so in love with the technology—a genuinely elegant piece of engineering—that we neglected to verify whether anyone would pay for it. Eighteen months and a small inheritance later, we dissolved the company with good grace and considerable embarrassment.

The second one died because of co-founder conflict. We had not discussed equity, decision-making, or what we would do if one of us wanted to leave. When the crisis came—and it always comes—we had no framework for resolving it. The legal untangling took longer than the company had existed.

The third one died because we grew too fast. We had product-market fit, which felt like salvation after the first two failures, and we hired aggressively to capitalize on it. Eighteen people in eight months. The culture that had made the product good became impossible to maintain. The product got worse. Users noticed.

Three failure modes, three different lessons: build for a customer, not for the technology. Treat a co-founder relationship like a marriage—have the difficult conversations early. And grow slower than you think you should, because culture is harder to rebuild than it is to maintain.

I am working on a fourth company. I am making different mistakes this time, which feels like progress.',
 'public', 'published', 260, 2, ARRAY['startups','entrepreneurship','failure','business'], NOW() - INTERVAL '52 days', NOW() - INTERVAL '52 days', 934, 198, 241, false, false, 38, 'approved'),

-- Isabella Romano (a1000012) - architecture/design
(gen_random_uuid(), 'a1000012-0000-0000-0000-000000000012',
 'What Brutalist Architecture Gets Right (And Wrong)',
 'Brutalism is having a cultural rehabilitation. Buildings that were scheduled for demolition are now listed. Coffee table books celebrate their mass and shadow. The same concrete slabs that were considered eyesores in the 1990s are now the subjects of architectural pilgrimage.

Part of this is the predictable arc of taste—everything becomes interesting once it is old enough to be historical rather than just unfashionable. But I think there is something more specific happening with Brutalism that is worth examining.

These buildings were built with a genuine ideological commitment. Social housing at a scale that took housing seriously as a public good. Universities designed for students who were the first in their families to attend. Civic buildings that declared, through sheer physical presence, that public institutions mattered. You can disagree with how they executed this vision. The vision itself was not trivial.

Where Brutalism failed: the gap between the architect''s experience of a building and the occupant''s. A Corbusian street-in-the-sky sounds compelling in theory and was sometimes deeply hostile in practice. Spaces that looked heroic in architectural photographs were often dark, cold, and poorly maintained.

The buildings that have survived best are those where the utopian vision was modified by attention to how actual humans would actually live. Which is, it turns out, the central challenge of all architecture: making something that is also a setting for ordinary life.',
 'public', 'published', 270, 2, ARRAY['architecture','design','brutalism','history'], NOW() - INTERVAL '37 days', NOW() - INTERVAL '37 days', 743, 138, 162, false, false, 24, 'approved'),

-- Kieran Murphy (a1000013) - politics/society
(gen_random_uuid(), 'a1000013-0000-0000-0000-000000000013',
 'The Slow Death of Third Spaces and What We Lost',
 'The pub, the library, the barbershop, the town square, the community centre. These are what sociologist Ray Oldenburg called "third places"—spaces that are neither home nor work, where people mix informally across class and background, where community cohesion is quietly maintained.

Most of them are dying. UK pub closures have been running at several per day for over a decade. Libraries face continuous budget pressure. Community centres are sold for development. The informal civic infrastructure that took generations to build is being quietly liquidated.

What is replacing them is the private: the gym with its membership fee, the coffee shop where a seat requires a purchase, the park that might be closed for a ticketed event. These are not third places in Oldenburg''s sense. They are commercial spaces that allow some social mixing as a byproduct of consumption. The difference matters.

Third places work because they do not require spending money to justify your presence. The person nursing a single pint for two hours in a pub and the person on their fourth round have equal standing. This informality is what allows genuinely cross-class, cross-background mixing in a way that commercial spaces, which tend to sort by price point, do not.

I do not have a simple policy prescription. But I think naming what we are losing is the necessary first step. We are not just losing buildings. We are losing the infrastructure of serendipitous connection.',
 'public', 'published', 265, 2, ARRAY['society','community','urbanism','politics'], NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days', 812, 167, 195, false, false, 30, 'approved'),

-- Yuna Kim (a1000014) - personal essays
(gen_random_uuid(), 'a1000014-0000-0000-0000-000000000014',
 'On Being the Child of Immigrants',
 'My parents came to Canada from Seoul in 1987 with two suitcases and the phone number of a distant cousin they had never met. They did not speak French. They did not speak much English either. They worked in a dry-cleaning shop in Montreal for three years before saving enough to open their own.

Growing up between cultures is described sometimes as a gift—twice the identity, twice the perspective. That is true. It is also described as a burden—belonging fully to neither, always translating yourself. That is also true. It is mostly just what it was.

What I understand now that I did not understand at fifteen: the code-switching my parents did constantly, moving between Korean with the family friends and heavily accented English with customers, was an exhausting form of labor that was never named or compensated. I did a version of it at school—Korean at home, aggressively Canadian everywhere else—and the effort of it only became visible to me once I was out of it.

My Korean is now worse than my parents'' English. This is a kind of loss I cannot fully articulate. There are registers of my parents'' inner lives that I will never access, because the language that holds them is one I only half-speak.

I think about this often when I am with my own children, who are growing up speaking only English. The chain of transmission that my parents hoped to maintain—the language, the particular way of understanding the world it carries—ends somewhere in my generation. This is the ordinary grief of diaspora.',
 'public', 'published', 280, 2, ARRAY['immigration','identity','family','personal'], NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days', 1156, 234, 287, false, false, 52, 'approved'),

-- Marcus Bell (a1000015) - tech/AI
(gen_random_uuid(), 'a1000015-0000-0000-0000-000000000015',
 'AI Did Not Take My Writing Job. But It Changed It.',
 'When large language models became publicly available, a particular form of panic spread through the writing and editing industry. The panic was not unfounded. These tools can produce serviceable copy at a speed and cost that no human can match.

What I have found in practice, working as a writer and editor for the past three years since these tools became widespread: the question of what changed is more interesting than the question of what was lost.

What changed: the floor moved up. A mediocre brief can now be turned into a decent first draft by someone without strong writing skills. This is genuinely useful for business communication, internal documentation, summarization. The demand for that category of writing from human writers has dropped, and I think that is permanent.

What did not change: the demand for writing that is distinctive, surprising, earned, and true. Writing that contains a specific human sensibility rather than the averaged-out voice of the training data. Writing about things the model does not know because no one has written about them yet. Writing where the authority comes from lived experience and genuine expertise.

The writers I see struggling are those whose value proposition was volume and basic competence. The writers I see thriving are those with a strong point of view and genuine expertise. This is a genuine sorting, and I think the result is a writing market that rewards less of what is easy and more of what is hard. That is uncomfortable for people caught in the middle. Long-term it may not be entirely bad.',
 'public', 'published', 275, 2, ARRAY['AI','writing','technology','work'], NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', 1034, 219, 268, false, false, 47, 'approved'),

-- Fatima Al-Hassan (a1000016) - environment/science
(gen_random_uuid(), 'a1000016-0000-0000-0000-000000000016',
 'What Six Months Studying Coral Reefs Taught Me About Hope',
 'Marine biologists who work on coral reef systems have one of the more psychologically challenging jobs in science. You spend years building expertise in an ecosystem that is, by almost every measurable indicator, dying. The global bleaching events are accelerating. Localised pollution problems compound global temperature stress. The systems you have devoted your career to understanding are declining on a timescale you can observe within a single research project.

I spent six months on a research vessel in the Coral Triangle during my postdoc, and what I found was not despair—though I expected it—but a more complicated mix of grief and agency.

The grief is real and should not be minimized. Some reef systems we visited were genuinely beyond recovery within any realistic scenario. The right emotional response to witnessing that is sorrow, and the scientists who have stopped feeling it should probably worry about themselves.

The agency came from the reef systems that were surviving. Not thriving, mostly, but surviving—and in some cases actively recovering where local pressures had been reduced. These were not the product of grand international agreements. They were the result of specific communities making specific decisions about fishing practices and pollution.

The story of climate and ecosystem collapse is frequently told at a scale that makes individual and local action feel meaningless. The science does not support that conclusion. Scale matters. But everything that happens at scale is made of things that happen at human scale first.',
 'public', 'published', 270, 2, ARRAY['environment','science','coral-reefs','climate'], NOW() - INTERVAL '43 days', NOW() - INTERVAL '43 days', 789, 156, 183, false, false, 26, 'approved'),

-- Lucas Petit (a1000017) - film/culture
(gen_random_uuid(), 'a1000017-0000-0000-0000-000000000017',
 'Why French New Wave Cinema Still Matters',
 'Breathless came out in 1960 and it is still the most influential film I have ever seen, despite—or perhaps because of—the fact that it breaks nearly every rule of mainstream cinema. The jump cuts that would get a student filmmaker failed. The dialogue that goes nowhere and everywhere simultaneously. The ending that refuses to satisfy.

Godard, Truffaut, Rohmer, Varda: these directors made films at a moment when cinema was questioning what cinema was. Their answer—which still feels radical—was that a film can be about ideas as directly as an essay. That the camera is a writing instrument. That the audience can be addressed rather than simply captured.

What the French New Wave invented is still underused: the movie that thinks about itself without losing its humanity. The Brechtian distance that somehow makes you more emotionally invested, not less. The refusal of the smooth, the resolved, the final chord.

What keeps contemporary cinema from inheriting this is primarily economic. An experimental film with a $500,000 budget made by a director with complete creative control is possible. That same freedom at a $50 million budget requires risk tolerance that studios have largely decided they cannot afford.

The most interesting contemporary filmmakers—Céline Sciamma, Jia Zhangke, the Dardenne brothers—are working in conditions closer to those that produced the New Wave than anything in the Hollywood mainstream. Perhaps economic constraint remains the necessary mother of formal invention.',
 'public', 'published', 265, 2, ARRAY['film','cinema','french-new-wave','culture'], NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days', 723, 134, 156, false, false, 22, 'approved'),

-- Elena Volkov (a1000018) - psychology/wellness
(gen_random_uuid(), 'a1000018-0000-0000-0000-000000000018',
 'Therapy Changed How I Think About Anger',
 'I started therapy because my manager at the time suggested, with diplomatic imprecision, that I might benefit from "working on my communication style." I went in defensive and came out, after about a year, substantially different in ways I had not anticipated.

The thing that changed most was my relationship to anger. I had grown up in a family where anger was either denied or explosive—no middle register. You were fine until you were not, and when you were not, furniture moved. I had internalised this model completely without knowing it.

What therapy offered was the radical and initially annoying suggestion that anger is information before it is anything else. It tells you something important: a boundary has been crossed, a value has been violated, a need is not being met. Responding to that information productively requires pausing long enough to hear what it is actually saying.

The technique I use now is embarrassingly simple: I wait twenty-four hours before sending any message written in anger. This single rule has prevented perhaps fifteen significant professional and personal ruptures. The messages I draft in the heat of the moment are almost always true but almost always unhelpful.

The deeper lesson: emotions are not things that happen to you and then need to be either expressed or suppressed. They are data that, read correctly, can guide genuinely good decisions. Learning to read them is a skill, not a talent. It can be taught.',
 'public', 'published', 260, 2, ARRAY['psychology','therapy','mental-health','personal-growth'], NOW() - INTERVAL '26 days', NOW() - INTERVAL '26 days', 892, 187, 224, false, false, 39, 'approved'),

-- Aiden Walsh (a1000019) - gaming/tech
(gen_random_uuid(), 'a1000019-0000-0000-0000-000000000019',
 'Video Games Helped Me Through Grief. Here Is How.',
 'My brother died in February two years ago. He was thirty-one. What comes after that kind of loss is not well described by the stages-of-grief model, which implies a tidier progression than the actual experience of moving through life with a hole in it.

In the months after his death, I played video games for hours every evening. Specifically: I finished three Dark Souls games and started Elden Ring. This is not, I understand, what most people picture when they imagine healthy grief processing.

But here is what those games did: they put me in a state where I had to pay complete attention to something that was not the absence of my brother. Not distraction—something more active. These games punish inattention with immediate failure. There is no room in your mind for grief while you are managing a boss fight that has killed you eleven times.

The spaces between sessions were different. I cried more freely after two hours of focused play than I had been able to cry during the day. My therapist had no particular theory about why. But the rhythm—intense focused presence, then release—seemed to create something.

My brother was also a gamer. We had finished Dark Souls 1 together the summer before he died, trading the controller at the difficult parts. Playing through the sequel felt, irrationally but genuinely, like continuing a conversation.',
 'public', 'published', 265, 2, ARRAY['gaming','grief','mental-health','personal'], NOW() - INTERVAL '57 days', NOW() - INTERVAL '57 days', 1289, 267, 332, false, false, 64, 'approved'),

-- Naomi Adeyemi (a1000020) - literature/writing
(gen_random_uuid(), 'a1000020-0000-0000-0000-000000000020',
 'Writing About Nigeria While Living Abroad: The Distance Problem',
 'The most common critique I receive from Nigerian readers of my fiction is that it does not smell right. This is how one reader put it in an email that was otherwise largely positive: "The Lagos you describe is accurate, but it does not smell right."

She was not being unkind. She was pointing at something real. I have lived in London for nine years. I visit Lagos twice a year. The city I write about is partly lived experience and partly constructed from memory, research, phone calls with friends, and the particular grief of loving a place you no longer fully inhabit.

The question of who has the right to write about what is often framed as an identity question. I think it is more usefully framed as an accuracy question. The issue is not whether I have the right to write about Lagos. It is whether I am getting it right, and getting it right in the specific, sensory, granular way that determines whether fiction earns its subject.

Distance can be a tool. The things I notice when I return to Lagos—the texture of the heat, the specific character of the traffic noise, the way conversations move—are things I had stopped noticing when I lived there because they were simply the air. Living away made them visible.

But distance is also a limitation. The Lagos that has formed since I left—its new neighborhoods, its evolving slang, its current anxieties—is one I know secondhand. The smell problem is the smell of secondhand knowledge. I am working on it.',
 'public', 'published', 270, 2, ARRAY['writing','nigeria','diaspora','literature'], NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days', 834, 162, 194, false, false, 31, 'approved'),

-- Ben Carter (a1000021) - economics/finance
(gen_random_uuid(), 'a1000021-0000-0000-0000-000000000021',
 'What Housing Policy Gets Wrong (And One Country That Gets It Right)',
 'The housing crisis in most English-speaking cities is not a mystery. The causes are well-understood: restrictive zoning that limits supply in desirable areas, planning processes that give incumbents veto power over new development, and a political economy in which homeowners are a numerically and financially powerful constituency with strong incentives to block the construction that would moderate their asset values.

The solutions are also known. They require political will that has, in most places, been serially absent.

Singapore is the obvious counter-example, and it is instructive precisely because it is uncomfortable for people on both left and right. The Housing Development Board was given the mandate and the tools to build public housing at scale in the 1960s and 70s. The result: over 80% of Singaporeans live in HDB flats. The waiting list is managed. The quality is generally decent.

The Singapore model required: a government willing to exercise compulsory purchase at scale, a public housing agency with genuine competence and independence, and a political class that decided housing people was a priority rather than a talking point.

None of these conditions obtain in the UK, the US, or Australia. The gap between the quality of our housing policy conversation and the quality of Singapore''s policy outcomes is not a gap of knowledge. It is a gap of political will and institutional capacity. Both are reconstructible. Neither is being reconstructed.',
 'public', 'published', 265, 2, ARRAY['housing','policy','economics','cities'], NOW() - INTERVAL '41 days', NOW() - INTERVAL '41 days', 912, 178, 214, false, false, 35, 'approved'),

-- Zara Hussain (a1000022) - fashion/identity
(gen_random_uuid(), 'a1000022-0000-0000-0000-000000000022',
 'What Wearing Hijab in Fashion Media Taught Me',
 'When I started my career at a fashion magazine in London six years ago, I was one of two women in an editorial team of twenty who wore hijab. The other one had been there for twelve years. We had a very specific conversation the week I started: she told me which meetings to arrive early to, which editors had preconceptions worth addressing head-on, and which ones just needed time.

Fashion is an industry that is simultaneously obsessed with diversity as a concept and resistant to it in practice. The diversity that the industry welcomes tends to be visible, photogenic, and reducible to a single legible narrative. The diversity it struggles with is the kind that requires genuine structural change.

What I have found in six years: the magazines that have diversified meaningfully did so because individuals with authority—editors in chief, creative directors—decided it mattered and made specific operational decisions, not because they issued statements. The statements are the easiest part.

What has changed: the industry has become genuinely more aware of what it has been excluding. What has not changed: the pathways by which young women who look like me enter senior roles. Awareness without changed opportunity structures is marketing.

I say this as someone who has benefited from the current moment of visibility. I am grateful for it and clear-eyed about its limits. Both things are true.',
 'public', 'published', 260, 2, ARRAY['fashion','identity','diversity','islam'], NOW() - INTERVAL '29 days', NOW() - INTERVAL '29 days', 778, 159, 189, false, false, 28, 'approved'),

-- Finn Larsen (a1000023) - outdoors/environment
(gen_random_uuid(), 'a1000023-0000-0000-0000-000000000023',
 'Solo Hiking the Norwegian Coast: Lessons in Silence',
 'The plan was fourteen days along the Nordsjøvegen coastal route. What I had not planned for: the quality of the silence. Not the absence of noise—there was wind and water and birds constantly—but the absence of human-generated information. No notifications. No conversation obligations. Just the path and the weather and the particular problem of making camp before dark.

By day four, something in my thinking changed. Without the constant stimulus of incoming information, my mind stopped processing and started generating. Old memories surfaced unprompted. I found myself working through problems that had been sitting in background processing for months, suddenly available to conscious attention.

This is the thing nobody tells you about long solo hikes: they are a form of cognitive archaeology. You reach things that had been buried under the daily accumulation of input. Not always comfortable things. But useful ones.

The loneliness came in waves. Day five was the hardest—a long day in poor weather with no view and no obvious reward, and the sudden clarity that I was very far from anyone who knew me. I sat in the tent that evening with tea and a damp paperback and decided that this too was a useful thing to know: what I was like when no one was watching and the conditions were bad.

I was, apparently, someone who made tea and kept reading. I found that encouraging.',
 'public', 'published', 260, 2, ARRAY['hiking','norway','solo-travel','nature'], NOW() - INTERVAL '46 days', NOW() - INTERVAL '46 days', 867, 172, 204, false, false, 32, 'approved'),

-- Diana Nguyen (a1000024) - tech/UX
(gen_random_uuid(), 'a1000024-0000-0000-0000-000000000024',
 'The UX Patterns That Make People Feel Bad (And Why We Keep Using Them)',
 'Dark patterns are the design techniques that trick or manipulate users into doing things they did not intend. The pre-checked subscription box. The unsubscribe flow that takes seven steps. The countdown timer that resets when it reaches zero. The confirmation dialog where the "cancel" button cancels your cancellation.

Most designers who use these patterns know exactly what they are doing. The honest conversation in product reviews sounds like: "This increases conversion by 15% and we can defend it legally." The dishonest conversation presents them as "optimized user flows."

The companies that use them most aggressively are not, on the whole, the villains of their own stories. They are companies under growth pressure making decisions that individually seem defensible and collectively degrade the environment of trust that digital products depend on.

There is a genuine cost to this, and it is starting to show up in data. Users who feel manipulated do not become loyal customers. They become users who switch providers the first time an alternative appears, and they tell people about it. The short-term conversion gains are being purchased with long-term brand erosion.

The designers and product managers who push back on dark patterns within their organisations are doing something genuinely important. It is not always easy. The incentive structures push the other way. But the alternative—an internet populated primarily by hostile interfaces—is one where nobody wins.',
 'public', 'published', 265, 2, ARRAY['UX','design','tech','ethics'], NOW() - INTERVAL '23 days', NOW() - INTERVAL '23 days', 756, 147, 172, false, false, 25, 'approved'),

-- Samuel O'Brien (a1000025) - history/culture
(gen_random_uuid(), 'a1000025-0000-0000-0000-000000000025',
 'What the Irish Famine Can Teach Us About Policy Responses to Crisis',
 'The Great Famine of 1845-1852 killed approximately one million people and drove another million from Ireland while food was being exported from the country. This is the fact that stops most people: Ireland was exporting food during a famine. The crop that failed was the potato; other crops were being grown and sold.

This was not, precisely, indifference—though there was plenty of that. It was the application of an ideological framework to a crisis for which that framework was catastrophically inappropriate. The prevailing view in the British government was that intervention in markets was wrong in principle and that private charity and market mechanisms would resolve the crisis. The evidence that this was not working did not change the framework. The deaths continued.

The lesson that historians of the Famine draw is not simply "intervention good." It is more specific: the inability to update a model in the face of evidence is not just intellectually wrong; at scale, it is murderous. The people who had the power to change policy during the Famine were not stupid. They were ideologically committed in a way that made them immune to feedback.

This pattern—an ideological prior so strong that contradictory evidence is either dismissed or reinterpreted to fit—is the signature of most major policy failures. Climate, pandemic response, housing: the failures are rarely for lack of information. They are failures of frameworks under pressure.',
 'public', 'published', 270, 2, ARRAY['history','ireland','policy','famine'], NOW() - INTERVAL '54 days', NOW() - INTERVAL '54 days', 923, 189, 226, false, false, 37, 'approved'),

-- Leila Ahmadi (a1000026) - poetry/literature
(gen_random_uuid(), 'a1000026-0000-0000-0000-000000000026',
 'On Translating Persian Poetry: What Gets Lost and What Survives',
 'Translating Hafez is an act of successive humiliations. You begin with the arrogance that you understand what he meant. The first humiliation is discovering how many layers of meaning a single word carries in Farsi that have no equivalent in English. The second is discovering that the sound of the original—its prosody, its rhymes, the music that carries the meaning—cannot survive the crossing. The third is discovering that what seems like a decision to translate a specific word one way rather than another is actually a theological and philosophical commitment that you are not qualified to make.

I have been translating Persian poetry for seven years. I have produced versions—I prefer the word to "translations"—that I think are useful and sometimes beautiful. I have never produced anything that fully replaces the original for someone who can read the original.

What survives: the images, usually. The rose and the nightingale, the tavern and the wine, the Beloved who is simultaneously human and divine. These cross.

What does not survive: the ambiguity. English is a language that tends toward precision. Farsi poetry lives in productive ambiguity—the word that means both "heart" and "mind," the construction that can be read as sacred or profane. Forcing a reading for the translator''s convenience kills something essential.

My approach now: leave the ambiguity ambiguous. Trust the reader to hold two meanings simultaneously. This is, actually, what reading good poetry requires.',
 'public', 'published', 265, 2, ARRAY['poetry','translation','persian','literature'], NOW() - INTERVAL '39 days', NOW() - INTERVAL '39 days', 712, 145, 167, false, false, 23, 'approved'),

-- Jacob Stern (a1000027) - finance/personal
(gen_random_uuid(), 'a1000027-0000-0000-0000-000000000027',
 'The Personal Finance Advice I Wish I Had Received at 22',
 'At twenty-two I was earning my first real salary and spending almost all of it. This is not unusual. What is unusual is how long it took me to understand why, and what the fix actually was.

The standard personal finance advice—spend less, save more, invest in index funds—is correct and essentially useless. It tells you what to do without addressing why most people do not do it, which is that spending provides immediate gratification and saving provides abstract future benefit, and human cognition is very poorly designed for that tradeoff.

The thing that worked for me: automation. Not discipline, not motivation, not tracking every purchase. Automation. I set up a standing order on the day my salary landed to move a fixed percentage to savings and investment before I could see it as available. Within three months, I had stopped thinking of the remainder as a reduced amount and started thinking of it as my salary. The money I did not see, I did not miss.

The second thing: a very clear picture of what the money is for. Saving as an abstract virtue is too weak a motivation. Saving for a specific thing—a house deposit, a career change with a gap year, financial independence by 55—provides the emotional charge that sustains the behavior through months when you would rather spend.

The third thing, which I wish someone had told me directly: your savings rate matters far more than your investment returns, especially early. Getting the rate to 20% is worth more than optimizing between index funds.',
 'public', 'published', 265, 2, ARRAY['personal-finance','money','savings','advice'], NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', 1123, 234, 278, false, false, 48, 'approved'),

-- Maya Patel (a1000028) - wellness/yoga
(gen_random_uuid(), 'a1000028-0000-0000-0000-000000000028',
 'Ten Years of Teaching Yoga: What I Actually Think Now',
 'When I started teaching yoga in my late twenties, I believed in the spiritual framework completely. The chakras, the energy work, the transformation that was supposed to happen when practice was deep enough. I was a good teacher precisely because I was not performing belief—I genuinely held it.

Ten years later, my relationship to the framework is more complicated. I still teach. I think yoga practice has genuine and well-documented benefits for mental and physical health. I have watched hundreds of students change in ways that look very much like transformation. But the explanatory framework I used to offer for why these changes happened has become harder for me to maintain with conviction.

What I know concretely: sustained physical practice changes your relationship to discomfort. Breathing practices—pranayama—have real effects on the nervous system. A room full of people doing something quietly together creates a specific quality of collective experience. None of these require a metaphysical explanation, though they are compatible with one.

What I have stopped doing in class: using language I do not believe. This has made me, I think, a less charismatic teacher and possibly a better one. The students who stay are not looking for certainty. They are looking for a practice. A practice does not require a theology.',
 'public', 'published', 260, 2, ARRAY['yoga','wellness','spirituality','teaching'], NOW() - INTERVAL '32 days', NOW() - INTERVAL '32 days', 867, 178, 212, false, false, 36, 'approved'),

-- Tom Eriksson (a1000029) - tech/software
(gen_random_uuid(), 'a1000029-0000-0000-0000-000000000029',
 'Why I Write Code the Old Way (And Am Not Sorry)',
 'I have been writing software professionally for sixteen years. In that time I have watched frameworks rise and fall, paradigms shift, languages come in and out of fashion. I have done React and pre-React. Containerized everything and regretted it. Adopted microservices and then spent a year helping a team consolidate them back into a monolith.

My current position: for most applications, simple is better. A boring, well-understood technology stack with good documentation, obvious deployment, and code that a developer returning after six months can understand without a companion guide will outperform a sophisticated, cutting-edge system in almost every real-world situation.

The reason is maintenance. Software is not primarily written; it is maintained. The person who writes the clever, architecturally ambitious solution typically moves on. The people who maintain it inherit complexity they did not create and often cannot fully understand.

I am not arguing against learning new things. I learn new things constantly, because the field changes and some changes are genuine improvements. I am arguing for a more sceptical relationship to complexity. Every time I add a new abstraction layer, I ask: what specific, observable problem does this solve that a simpler approach cannot? If I cannot answer that question clearly, the layer does not go in.

The software I am most proud of is also the most boring. It has been running without incident for eight years. Nobody talks about it. It just works.',
 'public', 'published', 255, 2, ARRAY['software','engineering','simplicity','technology'], NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days', 823, 167, 196, false, false, 31, 'approved'),

-- Grace Kwon (a1000030) - art/personal
(gen_random_uuid(), 'a1000030-0000-0000-0000-000000000030',
 'How I Learned to Stop Finishing Every Book I Started',
 'I was a "finish every book" person for the first twenty-eight years of my life. Having started something, I felt compelled to complete it. The novel that lost me two hundred pages in, the nonfiction that had said its central thing by chapter three and then spent six more chapters elaborating it—I ground through all of them on principle.

This is not reading. This is homework you have assigned yourself.

The rule I operate by now: if a book has not earned my continued attention by page fifty, I stop. Not with guilt—books are not pets, they do not suffer when put down—but simply and without ceremony. I write "abandoned" in my reading notes and move on.

The effect was immediate and significant: I read more because I read with less dread. If the next book is disappointing, the cost is fifty pages, not three weeks. The average quality of books I finish has increased because the selection mechanism is now sharper.

The deeper shift was philosophical. I grew up in a household where finishing things was a moral quality. Persistence, completion, seeing things through—these were virtues. They are virtues. But they are not always the right virtues for the situation. A book that is not good enough to continue reading is not made better by my persistence. My time is finite and my reading list is not.',
 'public', 'published', 245, 2, ARRAY['books','reading','habits','personal'], NOW() - INTERVAL '17 days', NOW() - INTERVAL '17 days', 934, 189, 223, false, false, 37, 'approved'),

-- Omar Hassan (a1000031) - architecture/urban
(gen_random_uuid(), 'a1000031-0000-0000-0000-000000000031',
 'Cairo From Memory: A City That Does Not Stand Still',
 'I left Cairo when I was nineteen and went back for the first time at twenty-seven. The neighbourhood where I had grown up had a mall on a site that used to be a park. The bakery my grandfather had taken me to every Friday morning was a mobile phone shop. The particular smell of the city—dust and exhaust and something floral I had never identified—was still there. That, at least, had not changed.

Cities are not museums, and Cairo never pretended to be. It has been one of the world''s largest cities for over a thousand years, and in that time it has demolished and rebuilt itself continuously, each era treating the previous one''s infrastructure as raw material. The fatimid walls that still stand are there somewhat despite the city, not because of any particular reverence for them.

What I was unprepared for was my own reaction to the change. Intellectually I understood that cities change. Emotionally I had preserved my particular Cairo in amber and then visited a different city that happened to have the same name. The mismatch was disorienting in a way I had not anticipated.

I now think this is the central experience of return: not finding a preserved past, but finding the evidence that the past was always moving, and that the version you held was already a partial construction. Your memory has been stable. The city has not. The Cairo of my grandfather''s stories was already a reconstruction by the time I arrived. Mine will be someone else''s.',
 'public', 'published', 265, 2, ARRAY['cairo','urban','memory','place'], NOW() - INTERVAL '49 days', NOW() - INTERVAL '49 days', 745, 148, 173, false, false, 24, 'approved'),

-- Nina Johansson (a1000032) - mental health/personal
(gen_random_uuid(), 'a1000032-0000-0000-0000-000000000032',
 'What Burnout Actually Feels Like (From the Inside)',
 'I did not recognise burnout when it was happening to me because I had the wrong model of what it was. I thought burnout meant not wanting to work. What it actually felt like was: working constantly, with great effort, while somehow producing less with each passing week. Like trying to drive a car with the handbrake on.

The warning signs I missed: I stopped being curious. This is, for me, more alarming than fatigue. I am by nature someone who finds things interesting—obscure topics, new ideas, unexpected connections. In the six months before I took extended leave, nothing was interesting. Information arrived and was processed and was filed. Nothing sparked.

I also stopped being funny. My closest colleagues noticed before I did. The particular quality of attention that generates humor—a kind of sideways engagement with the world, catching things at unexpected angles—requires reserves that I had depleted.

The recovery took about eight months. The first two were mostly sleep. I was not exaggerating when I told people I was tired: I was tired in a bone-deep way that rest alone did not fix. The next six were the slow rebuilding of a relationship with work that was not extractive.

What I changed: the definition of a successful day. Previously it was about output. Now it includes questions like: was I curious today? Did I help someone? Did I do something that I genuinely enjoyed? Output follows from these things. Pursuing output directly, at the expense of them, is the road I came from.',
 'public', 'published', 270, 2, ARRAY['burnout','mental-health','work','recovery'], NOW() - INTERVAL '34 days', NOW() - INTERVAL '34 days', 1045, 214, 258, false, false, 46, 'approved'),

-- Ryan McAllister (a1000033) - sports/culture
(gen_random_uuid(), 'a1000033-0000-0000-0000-000000000033',
 'What Football (Soccer) Taught Me About Cities',
 'The relationship between a football club and its city is unlike any other institution I can think of. Universities come close, but universities do not inspire the same tribal loyalty across class lines. Churches come close in some places and times, but the congregation is chosen rather than inherited. A football club is something you are born into, usually, and cannot fully exit.

I grew up supporting a club in a city I later left for work. The first season I lived somewhere else, I followed the results online with the same intensity I had when I lived twenty minutes from the ground. The club had become portable in a way the city had not.

This portability is what sports sociologists call "imagined community"—the sense of belonging to a collective that you cannot see or touch but can reliably find in any city where your club has fans. It is the same mechanism that nations run on, scaled down to something more manageable.

The stadiums matter to this in ways that are now under threat. When a club moves to a stadium on the edge of a motorway interchange because that is where the land was cheap, it breaks something. The geography of identity—knowing that this corner of this city is your club''s corner—is not sentiment. It is the actual material of community.

The clubs that have done this and lost their way are the cautionary tales. Rooted institutions, like root systems, do not transplant easily.',
 'public', 'published', 260, 2, ARRAY['football','soccer','cities','community','culture'], NOW() - INTERVAL '27 days', NOW() - INTERVAL '27 days', 689, 134, 158, false, false, 22, 'approved'),

-- Aisha Diallo (a1000034) - fashion/africa
(gen_random_uuid(), 'a1000034-0000-0000-0000-000000000034',
 'African Fashion on the Global Stage: Progress and Plunder',
 'Ankara print has been on European runways for several years now. Kente is in fashion editorials. Bogolan mud cloth appears in home décor collections from high-street retailers who have never mentioned Mali. The global appetite for African textiles and aesthetics is real, commercially significant, and morally complicated.

The complication: most of the commercial value generated by this appetite flows to European and American companies. The Senegalese weavers, the Ghanaian kente craftspeople, the Malian dyers who developed these traditions over generations are not, by and large, the beneficiaries of the global moment their work is having.

This is not a new problem. It is the textile version of a very old economic relationship. What is perhaps new is the degree to which African designers are now visible enough and connected enough to name it directly and to build alternatives.

The designers I find most interesting—Maki Oh, Orange Culture, Tongoro—are doing something more interesting than just using African textiles. They are using them within design frameworks that are also African in their aesthetics, their references, their relationship to the body. The result is something that cannot be easily extracted from its context, which makes it much harder to appropriate without attribution.

The most effective response to cultural and economic extraction is not just protest. It is building infrastructure that makes the original more visible than the copy.',
 'public', 'published', 265, 2, ARRAY['fashion','africa','culture','appropriation'], NOW() - INTERVAL '53 days', NOW() - INTERVAL '53 days', 834, 162, 193, false, false, 29, 'approved'),

-- Daniel Rosenthal (a1000035) - history/philosophy
(gen_random_uuid(), 'a1000035-0000-0000-0000-000000000035',
 'Reading Hannah Arendt in 2024',
 'Hannah Arendt published The Origins of Totalitarianism in 1951. It was read as a historical work—an analysis of Nazism and Stalinism that tried to understand how modern states had produced such systems. It was also, she was clear, a work of warning: these were not aberrations but products of specific conditions that could, in principle, recur.

Reading it now is a different experience than reading it as history. The passages on the destruction of the public realm—the space where citizens appear as equals before each other—read differently when that realm is under visible pressure. The analysis of the role of loneliness in mass movements does not feel dated.

What Arendt insists on, against the grain of much political thought before and since, is that politics is not primarily about interests or ideologies but about the human capacity for action—the ability to begin something new, to interrupt the automatic processes that otherwise determine outcomes. Freedom, for Arendt, is not a condition but an event. It happens when people act together in public.

The implication for now: the question is not what we think but what we do. The passive citizen who holds correct opinions contributes less than the active citizen who shows up. This is an old observation. But Arendt gives it philosophical weight that transforms it from a cliché into something with force.

Do I think we are close to the conditions she described? No. Do I think her analysis is currently irrelevant? Also no.',
 'public', 'published', 260, 2, ARRAY['philosophy','politics','history','arendt'], NOW() - INTERVAL '47 days', NOW() - INTERVAL '47 days', 789, 167, 195, false, false, 28, 'approved'),

-- Keiko Tanaka (a1000036) - food/japan
(gen_random_uuid(), 'a1000036-0000-0000-0000-000000000036',
 'Kaiseki and the Philosophy of Seasonal Eating',
 'Kaiseki—the multi-course Japanese formal cuisine—is organised around a principle that sounds simple and is in practice demanding: every dish should express the current season at its peak. Not seasonal ingredients loosely; the specific moment of the specific season. Spring kaiseki in early April tastes different from spring kaiseki in late May because the ingredients are different, the colours are different, the relationship to what came before and what comes next is different.

The philosophical framework behind this is mono no aware—the pathos of things, the bittersweet awareness of impermanence. In kaiseki, impermanence is not mourned but celebrated. The cherry blossom petal on the first course, floating in clear dashi, is beautiful precisely because it will not be there next week.

This is a very different relationship to food than the Western tendency toward the consistent and reproducible. The McDonald''s hamburger tastes the same in Tokyo as in Toronto because consistency is the product. Kaiseki offers something closer to the opposite: a single experience, available only now, that will never be exactly repeated.

I have been cooking kaiseki-influenced food at home for six years. The main thing it has changed is my relationship to the season cycle. I now have opinions about the specific week in October when matsutake mushrooms are at their best. I look forward to things I cannot get yet. The year has texture it did not have before.',
 'public', 'published', 260, 2, ARRAY['food','japan','kaiseki','philosophy','seasons'], NOW() - INTERVAL '38 days', NOW() - INTERVAL '38 days', 712, 148, 172, false, false, 25, 'approved'),

-- Patrick Duffy (a1000037) - tech/career
(gen_random_uuid(), 'a1000037-0000-0000-0000-000000000037',
 'Leaving Big Tech: One Year Out',
 'I spent eight years at a large technology company. Generous compensation, interesting technical problems, colleagues I genuinely liked. I left for reasons I found difficult to articulate at the time and understand better now: I had become a function rather than a person.

The specific experience was this: I could not answer the question "what did you do today?" in a way that felt meaningful. I had attended meetings. I had managed dependencies. I had contributed to something enormous and distributed in ways I could not see or feel. The work was real. My stake in it was abstract.

One year into working for a small company—sixteen people, one product, everyone visible—I understand the difference viscerally. When a feature I built goes out and customers use it, I see it happen. When something goes wrong, I feel responsible in a way that is proportionate to my actual contribution. The feedback loop is intact.

I earned significantly less. This is the honest version of the story that the "I left big tech" genre often glosses over. I could afford the cut because of savings and a relatively low cost of living. I am not suggesting this is a universally available choice.

What I would say to someone considering it: the psychological cost of invisible contribution is real and cumulative. If the money is not compensating for it, the exchange is bad. If it is, that is a legitimate trade. Only you can know which is true.',
 'public', 'published', 265, 2, ARRAY['career','tech','big-tech','work-life'], NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', 1034, 223, 271, false, false, 45, 'approved'),

-- Sara Lindqvist (a1000038) - environment/nordic
(gen_random_uuid(), 'a1000038-0000-0000-0000-000000000038',
 'What Sweden''s Relationship with Nature Taught Me',
 'Allemansrätten—the right of public access to nature—is written into Swedish law and, more significantly, into Swedish cultural DNA. You can walk, cycle, camp, and forage on almost any land in Sweden, including private land, with certain reasonable limitations. The land, even when owned, is understood to belong in some sense to everyone.

I grew up with this and did not understand how unusual it was until I moved abroad for several years and encountered the English relationship to land, which is almost the reverse: a presumption of private ownership and exclusion, public footpaths maintained against the resistance of landowners, access contested and negotiated rather than assumed.

The effects on how people relate to nature are profound. Swedes, broadly, have an easy and unsentimental relationship with being outdoors that I think derives directly from access. You learn to be in nature by being in nature, not by visiting designated recreation areas as a special occasion.

The friluftsliv tradition—outdoor life as a regular practice rather than an adventure—requires this access. You cannot have a culture of casual daily contact with nature if that contact requires booking, paying, or trespassing.

I think about this whenever the conversation turns to mental health and the evidence that time in natural environments improves it. The evidence is good. Acting on it requires more than public messaging about going outside. It requires that going outside be a genuine, accessible option. Rights matter before behaviours.',
 'public', 'published', 255, 2, ARRAY['nature','sweden','environment','land-rights'], NOW() - INTERVAL '42 days', NOW() - INTERVAL '42 days', 712, 145, 167, false, false, 22, 'approved'),

-- Carlos Reyes (a1000039) - music/production
(gen_random_uuid(), 'a1000039-0000-0000-0000-000000000039',
 'Producing Music in Your Bedroom: What Changed and What Did Not',
 'In 2004 you needed a studio to make a record. Not just for the equipment—though the equipment was prohibitively expensive—but for the accumulated knowledge, the trained ears, the specific acoustics that a real room had and a bedroom did not.

In 2024 you need a laptop, an audio interface, and a set of headphones. The knowledge that used to live in studios is now in tutorials, forums, and software that can emulate classic gear at processing costs that would have been impossible ten years ago. The democratization is real and significant.

But something was also lost, and I want to be honest about what it was: the pressure. When studio time costs several hundred euros per day, you show up prepared. You have rehearsed. You have made decisions in advance. You do not experiment endlessly because you cannot afford to. The constraint produced a discipline that the unlimited home studio does not naturally generate.

I have watched many talented bedroom producers spend years iterating on tracks that are never finished because there is no external pressure to finish them. The unlimited timeline becomes a curse rather than a gift. The work stays in draft perpetually because completion requires a decision to stop improving, and there is always more to improve.

My solution: I set a release date before I start. The track is finished on that date regardless of whether I am satisfied. Constraint is a feature, not a bug. I put it in deliberately because the medium will not put it in for me.',
 'public', 'published', 255, 2, ARRAY['music','production','creativity','technology'], NOW() - INTERVAL '36 days', NOW() - INTERVAL '36 days', 778, 156, 183, false, false, 27, 'approved'),

-- Emily Wu (a1000040) - climate/science
(gen_random_uuid(), 'a1000040-0000-0000-0000-000000000040',
 'Climate Anxiety and the Problem of Scale',
 'The defining psychological challenge of climate change is not grief or anger but scale. The problem is genuinely global, genuinely long-term, and genuinely dependent on systems and actors far beyond the influence of any individual. The honest response to this reality could be paralysis. For a lot of people, it is.

I have spent three years studying how people psychologically navigate the gap between the scale of the problem and the scale of available action. What I have found is that the most effective responses combine two things that seem contradictory: an unflinching acknowledgment of the severity of the situation, and a focus on specific, concrete, achievable actions.

The paralysis tends to come when people hold the full severity of the problem in mind without a pathway out. The response becomes global catastrophe versus individual action, and the mismatch is so vast that action feels absurd. But this is the wrong frame.

The right frame: every large-scale change is made of small-scale changes. The trajectory of renewable energy adoption was changed by millions of individual installation decisions. Policy changes are preceded by shifts in what is politically thinkable, which are preceded by shifts in public opinion, which are changed by conversations, which are started by individual people deciding to have them.

The research shows: the best predictor of sustained climate action is not information about the scale of the problem. It is a sense of efficacy—the belief that your specific action is part of a causal chain that matters. Preserving and building that sense is, itself, a form of climate action.',
 'public', 'published', 265, 2, ARRAY['climate','psychology','anxiety','environment'], NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days', 889, 178, 212, false, false, 33, 'approved'),

-- Alex Novak (a1000041) - politics/history
(gen_random_uuid(), 'a1000041-0000-0000-0000-000000000041',
 'What Prague Spring Can Still Teach Us',
 'In 1968, Alexander Dubček led a brief experiment in Czechoslovakia called socialism with a human face. For eight months, censorship was lifted, political pluralism was entertained, and a genuinely different model of socialism seemed possible. In August, Soviet tanks ended the experiment. What followed was twenty years of "normalization"—a system designed to produce compliance through a combination of surveillance and small comforts.

The intellectual question that has interested me since I first studied this period: why do systems that require active terror eventually settle for passive compliance? The answer, I think, is efficiency. Constant terror is expensive and generates resistance. A population that has traded political ambition for personal comfort—the deal normalization offered—maintains itself.

Milan Kundera''s novel The Unbearable Lightness of Being was written in the shadow of this. The characters live in the aftermath of August 1968 and navigate life under a system that does not require them to believe anything, only to perform non-resistance. The book is, among other things, an analysis of what this does to people: how the withdrawal of political possibility changes the texture of private life.

What Prague Spring still teaches: the possibility of doing things differently is not theoretical. It exists in history. It was tried. It was ended by external force, not by internal failure. That distinction matters.',
 'public', 'published', 255, 2, ARRAY['history','politics','czechoslovakia','cold-war'], NOW() - INTERVAL '51 days', NOW() - INTERVAL '51 days', 745, 156, 182, false, false, 25, 'approved'),

-- Hannah Webb (a1000042) - parenting/personal
(gen_random_uuid(), 'a1000042-0000-0000-0000-000000000042',
 'What Having Children Did and Did Not Change',
 'The standard account of having children is that it transforms you utterly. A completely new person emerges from the experience of becoming a parent. The old you—your priorities, your sense of self, your understanding of what matters—is replaced by something richer and deeper.

Some of this is true. Some of it is the story new parents tell themselves to metabolise a decision that is irreversible and expensive and exhausting.

What actually changed: my relationship to time. Before children I had, in principle, unlimited time. In practice I wasted a great deal of it. Now I have constrained time, which means every hour I carve out for something is a real decision. My writing has gotten better, counterintuitively, because I cannot write lazily. I have forty minutes. They have to count.

What did not change: who I fundamentally am, at the level of values, temperament, and what I find interesting. I had been told that nothing would matter except the children. I love my children with an intensity that is genuinely new in my experience. I also still care about my career, my friendships, my writing, my city. The love did not replace the rest; it was added to it.

The part of the standard account I resent: the implication that caring about your own life after having children is somehow selfish. It is not selfish. It is modelling for your children that adults have full interior lives. Which is, it turns out, something important for children to see.',
 'public', 'published', 265, 2, ARRAY['parenting','identity','personal','family'], NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days', 978, 201, 241, false, false, 40, 'approved'),

-- Ibrahim Al-Rashid (a1000043) - religion/culture
(gen_random_uuid(), 'a1000043-0000-0000-0000-000000000043',
 'What Ramadan Means in a Secular City',
 'I have fasted during Ramadan every year since I was twelve. For the first fifteen years, I did this surrounded by family—my mother''s kitchen producing iftar every evening, the mosque two streets away, the rhythm of the month shaped by shared observance. Then I moved to Amsterdam for work, and Ramadan became a solitary practice.

The difference in experience was surprising. Without the external scaffold—the social context that shapes the meaning of the fast—I had to understand for myself what the practice was about. The question of whether I was fasting for God, for community, for identity, for discipline, or some combination had been answered by context before. Now it needed an internal answer.

What I found: the solitude had unexpected value. Practices embedded in strong community have a way of becoming automatic—you observe them because everyone around you observes them, and the question of why does not press with urgency. When you are the only person in your office who is not eating lunch, the why becomes present and necessary.

My answer has changed over the years and I do not expect it to stop changing. Currently: I fast because it breaks the ordinary relationship between comfort and time. Hunger is present most of the day, and sitting with discomfort that is chosen—knowing it ends at sunset—is a useful practice regardless of the theological framework it sits in.

I still miss my mother''s kitchen at iftar. Some things community provides that practice alone cannot.',
 'public', 'published', 265, 2, ARRAY['islam','ramadan','religion','identity'], NOW() - INTERVAL '62 days', NOW() - INTERVAL '62 days', 812, 168, 198, false, false, 30, 'approved'),

-- Lucy Campbell (a1000044) - books/literature
(gen_random_uuid(), 'a1000044-0000-0000-0000-000000000044',
 'The Books That Changed How I Think About Money',
 'I spent most of my twenties in a complicated relationship with money: not enough of it, anxious about it, making decisions driven by short-term anxiety rather than long-term sense. The change did not come from a financial planner or a podcast. It came from books.

The Psychology of Money by Morgan Housel is the first finance book I have ever recommended to people who do not like finance books. Its central insight—that financial outcomes are determined less by what you know than by how you behave under uncertainty, and that behavior under uncertainty is shaped by personal history and psychology—sounds obvious in summary and is, in practice, the most useful thing I have read on the subject.

The Great Crash 1929 by John Kenneth Galbraith I read not for investment advice but because nothing disciplines financial thinking like understanding, in visceral detail, how spectacularly wrong very confident people can be. The analysts and investors in 1928 had arguments for why the market would continue rising. The arguments were coherent. They were wrong.

Das Kapital I read because I thought I should understand the foundational text of the critique I kept encountering. It took three months and I would not recommend it casually. But understanding the specific analysis Marx is making—not the cartoon version—changed how I think about whose interests financial systems are designed to serve.

The thread connecting these three books: money is a social technology, not a natural force. It does what the institutions governing it are designed to make it do. Understanding who designed those institutions and for whose benefit is prior to any specific financial decision.',
 'public', 'published', 275, 2, ARRAY['books','money','finance','economics'], NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', 867, 178, 210, false, false, 34, 'approved'),

-- Victor Chen (a1000045) - tech/AI
(gen_random_uuid(), 'a1000045-0000-0000-0000-000000000045',
 'Building AI Products: The Gap Between Demo and Reality',
 'The demo problem in AI products is specific and pervasive: a system that performs impressively in a controlled demonstration performs disappointingly in production, and the gap between the two is not primarily a technical problem but a distribution problem.

The demo is built on carefully selected inputs—the questions the system handles well, the documents that are cleanly formatted, the use cases that match the training distribution. The demo represents the peak of the system''s capability. Production represents the full distribution of user inputs, which contains many things the demo does not.

I have shipped three AI products in the past two years. In each case, the production experience diverged from the demo experience in the same ways: edge cases that seemed unlikely in advance turned out to be common in practice; users framed requests in ways that were semantically different from what the training data covered; the system''s failure modes were more visible to users than its capabilities were.

The honest version of AI product development involves: building failure-mode catalogues before shipping, not after. Designing for graceful degradation—the system failing visibly and understandably rather than silently and confusingly. Setting user expectations at the level of the median case, not the best case.

The most important thing I learned: in production, the question is not "what can this system do?" but "what does this system do when the input is not what you expected?" Until you can answer the second question, you do not yet have a product.',
 'public', 'published', 265, 2, ARRAY['AI','product','technology','startups'], NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days', 934, 198, 237, false, false, 38, 'approved'),

-- Ava Kowalski (a1000046) - culture/identity
(gen_random_uuid(), 'a1000046-0000-0000-0000-000000000046',
 'Growing Up Polish in Germany: The Invisible Minority',
 'There are over 1.5 million people of Polish origin in Germany. Culturally, economically, linguistically, they are among the most integrated immigrant groups in any European country. They are also almost entirely invisible in German public discourse about immigration and diversity.

The invisibility is partly the result of a kind of successful assimilation: Polish Germans often speak German without accent, move easily between Polish and German cultural frames, and do not map onto the visual or religious markers that German immigration discourse focuses on. We are the easy case, which means we are not the case being discussed.

What I find interesting about this invisibility is what it reveals about the structure of the diversity conversation. The diversity that receives attention is diversity that is visibly marked—that presents as difference in ways that cannot be easily overlooked. The diversity that is managed quietly and successfully remains un-theorised.

My own experience: I grew up speaking Polish at home and German at school, celebrating Polish traditions and German public holidays, reading Polish literature and watching German television. I did not experience this as conflict. I experienced it as richness. This experience is very common among Polish Germans and almost never appears in the stories Germany tells about immigration.

I am not suggesting my experience is more significant than harder ones. I am suggesting that the full range of experiences is necessary if we want an accurate picture.',
 'public', 'published', 255, 2, ARRAY['identity','immigration','germany','poland','culture'], NOW() - INTERVAL '33 days', NOW() - INTERVAL '33 days', 734, 145, 169, false, false, 23, 'approved'),

-- Henry Morrison (a1000047) - history/war
(gen_random_uuid(), 'a1000047-0000-0000-0000-000000000047',
 'Visiting the Somme: What Battlefields Do',
 'The Thiepval Memorial to the Missing on the Somme lists 72,195 names—British and South African soldiers who died in the Somme sector between 1915 and 1918 and whose bodies were never identified. The memorial is large enough that you understand, standing in front of it, that the list represents a different scale of death than you have ever been asked to contemplate.

I visited on a grey October morning with no other tourists present. The experience of reading names—arbitrary names, just looking for the pattern—was unexpectedly affecting. John Smith, Thomas Wilson, William Jones: the ordinariness of the names against the incomprehensibility of the number.

What battlefields do, when they are done well, is make abstraction material. The war was 72,195 men who do not have graves. That sentence contains all the information the name wall contains. But standing in front of the wall and reading names does something different to you than reading the sentence.

I think this is important to understand because it has implications for how we remember things that resist easy abstraction: atrocities, mass deaths, long institutional cruelties. The material memory—the wall, the museum, the physical place—carries something that written accounts, however good, cannot fully carry.

There is an argument about the limits of vicarious memorial experience that I take seriously. Visiting a site, however thoughtfully, is not the same as being connected to the event by family memory or community history. But it is something. Something that reading alone is not.',
 'public', 'published', 260, 2, ARRAY['history','war','somme','memory','travel'], NOW() - INTERVAL '56 days', NOW() - INTERVAL '56 days', 812, 167, 196, false, false, 30, 'approved'),

-- Nadia Petrov (a1000048) - languages/culture
(gen_random_uuid(), 'a1000048-0000-0000-0000-000000000048',
 'Learning Russian as an Adult: A Love Letter to Difficulty',
 'Russian has a reputation for being one of the hardest languages for English speakers to learn, and the reputation is earned. The case system alone—six cases, each changing word endings in patterns that have genuine logic but require months to internalise—would be enough. Add to this the verbal aspect system, the gender agreement, the spelling that is phonetically consistent in ways that take time to hear, and you have a language that will humble you for years before you feel anything like competent.

I started learning Russian at thirty-four. Not for any practical reason—I do not work with Russian speakers and did not plan to move anywhere Russian is spoken—but because I had listened to a recording of Akhmatova reading her own poetry and wanted to understand it directly.

This is, I appreciate, an unusual motivation. It was also, as it turned out, exactly sufficient. When the reason to learn is this specific, the engagement with difficult material is different. I was not learning Russian in the abstract. I was learning Russian in order to hear those specific poems in the only language they exist in.

Three years in, I can read Akhmatova with a dictionary. I can have slow, careful conversations. My Russian is objectively poor and still one of the things I am most proud of. The difficulty was the point. Learning something genuinely hard, for no career reason, purely because a Russian woman''s voice moved me to tears—this has improved my quality of life in ways I did not predict.',
 'public', 'published', 265, 2, ARRAY['language-learning','russian','culture','literature'], NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days', 867, 178, 211, false, false, 33, 'approved'),

-- Jack Fleming (a1000049) - career/personal
(gen_random_uuid(), 'a1000049-0000-0000-0000-000000000049',
 'On Being a Generalist in a World That Wants Specialists',
 'The career advice I received most consistently in my twenties: find your niche. Go deep, not wide. Specialise early and build expertise that compounds. This advice is not wrong. It is, however, not the only viable path, and for some people it is the wrong path.

I have worked in journalism, product management, strategy consulting, and am currently running a small research firm. The breadth has costs: I have never been the best person in a room at any single technical skill. I have had to rebuild credibility every time I changed domains. I cannot lean on years of deep expertise in one area.

What the breadth provides: I see connections between domains that specialists miss because specialists do not visit each other''s domains. The business problem that product management has already solved. The research methodology from social science that applies directly to the business question. The journalistic framing that makes a technical analysis comprehensible to its intended audience.

The generalist''s value is fundamentally integration. In a world of increasing specialisation, the people who can synthesize across silos have a specific value that the deepest specialist cannot always provide. Teams of specialists need translation and connection. That is what generalists do.

The practical advice I would give my younger self: do not apologise for breadth. Understand what it enables. Be explicit about the kind of value you provide and why that value is real. The world will tell you to specialise; decide for yourself whether that is the right advice for who you are.',
 'public', 'published', 255, 2, ARRAY['career','generalism','work','personal-development'], NOW() - INTERVAL '28 days', NOW() - INTERVAL '28 days', 945, 199, 238, false, false, 37, 'approved'),

-- Serena Blake (a1000050) - wellness/nutrition
(gen_random_uuid(), 'a1000050-0000-0000-0000-000000000050',
 'What Nutrition Science Actually Tells Us (It Is Less Than You Think)',
 'Nutrition science is one of the most methodologically challenged fields in all of science, and it is also one of the fields most actively covered by popular media. This combination—weak evidence, strong coverage—produces a public discourse that is systematically misleading.

The core problem: you cannot randomize humans to long-term dietary interventions and then wait to see who gets heart disease. The gold standard of evidence—the randomized controlled trial—is essentially unavailable for the most important nutrition questions. What we have instead is observational data with profound confounding, short-term trials with biomarker proxies, and animal studies that may or may not translate.

This does not mean nothing is known. The evidence that vegetables are good, that ultra-processed foods have adverse health effects compared to minimally processed alternatives, that extreme caloric restriction or excess has predictable consequences—this evidence is robust. But the evidence for most of the specific claims that dominate nutrition media is much weaker than the coverage implies.

Dietary fat was the villain for three decades. Carbohydrates became the villain. Saturated fat has been exonerated and reindicted several times. Each reversal is presented as a correction toward truth. The honest version is that the field is doing its best with tools that are not well-suited to the questions it is trying to answer.

Practical upshot: extraordinary claims about specific foods or nutrients warrant scepticism. The foundations—varied diet, minimal ultra-processing, appropriate quantity—are on solid ground. Everything built above that is more uncertain than it appears.',
 'public', 'published', 265, 2, ARRAY['nutrition','health','science','food'], NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', 834, 172, 204, false, false, 31, 'approved');
