import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uvlpxcbgakmmmmntayko.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2bHB4Y2JnYWttbW1tbnRheWtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzYxNTgsImV4cCI6MjA4ODUxMjE1OH0.Z9fkaKSPSwVu1imAZpyaRp7VVdyoDKUVxry5it6yydA';

const supabase = createClient(supabaseUrl, supabaseKey);

const samplePosts = [
  {
    title: "The Art of Mindful Living in a Digital Age",
    content: "In our hyper-connected world, finding moments of peace has become a revolutionary act. This morning, I watched the sunrise without my phone, and it reminded me that the best moments in life aren't captured—they're experienced. Mindfulness isn't about escaping technology; it's about using it intentionally. When we pause to breathe, to truly see the world around us, we reclaim our humanity. The digital age offers incredible tools, but our analog hearts still need quiet moments to thrive. Today, I challenge you to find five minutes of pure presence. No screens, no distractions—just you and the present moment. What you discover might surprise you.",
    interests: ['wellness', 'mindfulness', 'lifestyle']
  },
  {
    title: "Coffee Culture: A Journey Through Ethiopia's Highlands",
    content: "The birthplace of coffee holds secrets that Starbucks will never tell you. In the misty highlands of Ethiopia, I learned that coffee isn't just a beverage—it's a ceremony, a social glue, a daily meditation. Local farmers hand-pick each cherry with reverence, understanding that their harvest connects them to centuries of tradition. The traditional coffee ceremony takes hours, roasting green beans over charcoal, grinding by hand, and serving in three rounds called 'abol,' 'tona,' and 'bereka.' Each round gets progressively weaker but deeper in meaning. The first is for the body, the second for the soul, and the third for blessing. In our rush for efficiency, we've lost this sacred slowness. Perhaps the best cup of coffee isn't the fastest—it's the one shared with intention.",
    interests: ['travel', 'food', 'culture']
  },
  {
    title: "Why Junior Developers Are Your Secret Weapon",
    content: "After ten years in tech leadership, I've learned something counterintuitive: junior developers often bring more innovation than veterans. Why? They haven't learned what's 'impossible' yet. They question established patterns, challenge legacy decisions, and approach problems with fresh eyes. Senior developers are invaluable for their experience, but juniors are invaluable for their curiosity. I've watched junior team members suggest solutions that seniors dismissed as too complex, only to implement them elegantly because they didn't know they 'couldn't.' The best teams blend experience with naiveté, wisdom with wonder. If your engineering culture makes junior developers afraid to speak up, you're not just losing diverse perspectives—you're actively suppressing innovation. Invest in mentorship, celebrate questions, and remember: today's junior developer is tomorrow's architect.",
    interests: ['technology', 'career', 'programming']
  },
  {
    title: "The Renaissance of Analog Hobbies",
    content: "My hands are covered in clay, and I've never felt more alive. After years of screen-based work, I discovered pottery—and with it, a community of people rediscovering analog joy. Across cities, young professionals are learning woodworking, bookbinding, gardening, and calligraphy. We're not rejecting technology; we're balancing it. There's something profound about creating with your hands, about seeing immediate, tangible results of your effort. When you throw a pot on a wheel, you can't undo mistakes—you learn to work with imperfection. When you plant a garden, you can't rush growth—you learn patience. These lessons don't translate to digital life, and that's exactly why they're valuable. The renaissance of analog hobbies isn't nostalgia; it's wisdom. We're remembering that humans aren't meant to live entirely in virtual spaces.",
    interests: ['hobbies', 'crafts', 'lifestyle']
  },
  {
    title: "The Hidden Mathematics of Nature",
    content: "Fibonacci sequences in flower petals, fractals in ferns, golden ratios in nautilus shells—nature is a mathematician's masterpiece. As a biologist and math enthusiast, I'm constantly amazed by the elegant equations governing organic growth. Consider the hexagonal efficiency of beehives, arrived at through evolutionary optimization. Or the logarithmic spirals of galaxies and hurricanes, following the same mathematical principles at vastly different scales. These aren't coincidences; they're fundamental patterns of efficiency and beauty. When we study biomimicry, we're not just copying nature's designs—we're learning its mathematical language. The next generation of architecture, materials science, and engineering will be built on equations that life has been solving for billions of years. Nature isn't just beautiful; it's brilliantly calculated.",
    interests: ['science', 'nature', 'mathematics']
  },
  {
    title: "Building Community in the Age of Loneliness",
    content: "Despite being more 'connected' than ever, loneliness has become an epidemic. But I've discovered something beautiful: intentional community is staging a comeback. In my neighborhood, we started a simple practice—monthly potlucks with no agenda except gathering. No screens allowed, just food and conversation. What happened next surprised us all. We learned our neighbors' stories, formed support networks, and created safety nets for each other. When someone lost their job, we shared skills and connections. When someone had a baby, meals appeared without asking. This isn't revolutionary; it's how humans lived for millennia. We've just forgotten. Technology promised to connect us but often isolates us. Real community requires presence, vulnerability, and commitment. It's messy and inconvenient and absolutely essential. Start small: invite three neighbors for coffee. You might just spark a revolution of belonging.",
    interests: ['community', 'social', 'lifestyle']
  },
  {
    title: "The Philosophy of Failure: Lessons from a Failed Startup",
    content: "My startup died last year, and it was the best thing that ever happened to me. After two years of 80-hour weeks, we ran out of runway. I thought I'd be devastated. Instead, I felt relief—and then clarity. Failure strips away ego and reveals truth. We failed because we built something we thought people should want instead of what they actually needed. We failed because we prioritized features over fundamentals. We failed because we confused activity with progress. These weren't unique mistakes; they're startup clichés. But experiencing them firsthand taught me more than a hundred case studies ever could. The startup world glamorizes success, but failure is the better teacher. It forces honesty, builds resilience, and recalibrates priorities. My next venture will be different because I've learned to ask hard questions early. Failure isn't the opposite of success; it's the apprenticeship.",
    interests: ['entrepreneurship', 'business', 'personal-growth']
  },
  {
    title: "Rediscovering Wonder Through Children's Eyes",
    content: "My four-year-old stopped me during our walk today. 'Look, Mama,' she whispered, pointing at a snail crossing the sidewalk. We watched it for ten minutes—an eternity in toddler time. She narrated its journey, created a backstory, cheered its progress. I realized I'd walked past a thousand snails without seeing any of them. Children are masters of presence. They find wonder in puddles, conversations in clouds, adventures in cardboard boxes. We call it imagination, but it's really awareness—seeing what's actually there instead of what we expect. As adults, we trade wonder for efficiency, curiosity for certainty. We know too much to be amazed. But watching my daughter reminds me: wonder isn't lost; it's just dormant. It returns when we slow down, pay attention, and remember that ordinary things are extraordinary when truly seen. Today, I'm learning to see the world through her eyes again.",
    interests: ['parenting', 'family', 'mindfulness']
  },
  {
    title: "The Sustainable Food Revolution Happening in Your Backyard",
    content: "Urban farming is no longer fringe—it's the future. On my apartment balcony, I grow 40% of my vegetables. It started with herbs, then tomatoes, then an ambitious vertical garden system. Now my 200-square-foot space produces year-round food. I'm not alone. Cities worldwide are transforming rooftops into farms, parking lots into gardens, vacant lots into community orchards. This isn't just about food; it's about resilience, education, and connection. When you grow food, you understand seasons, respect resources, and appreciate farmers. You also drastically reduce your carbon footprint—no shipping, minimal packaging, zero food miles. My setup cost $300 and saves me that much annually in groceries. But the real yield isn't financial; it's the satisfaction of eating a salad I grew from seed. If you have a sunny window, you can start tomorrow. The revolution is delicious.",
    interests: ['sustainability', 'food', 'urban-living']
  },
  {
    title: "The Lost Art of Letter Writing",
    content: "Last month, I wrote my first handwritten letter in years. It took an hour to compose, my handwriting was rusty, and mailing it felt oddly ceremonial. My friend received it two weeks later and called me crying—happy tears. In our instant-message world, we've lost something profound: the weight of words. When you write by hand, you think differently. There's no backspace, no autocorrect, no endless editing. Your thoughts flow more honestly, more carefully. Letters are artifacts—physical proof that someone took time for you. They can be held, reread, treasured. Digital messages are convenient but ephemeral. They scroll past in newsfeeds, disappear in archives. A letter is a gift of time and intention. I've started a practice: one letter per month to someone who matters. It's slower than texting, less efficient than email, and infinitely more meaningful. In a fast world, slowness is radical.",
    interests: ['writing', 'relationships', 'nostalgia']
  },
  {
    title: "How Board Games Saved My Relationships",
    content: "Screens were killing my social life, so I bought a board game. Now, every Friday, friends gather at my place for game night. No phones allowed—they go in a basket at the door. What started as awkward has become sacred. We laugh, strategize, trash-talk, and actually talk. Board games create structured socializing. There's a shared focus, natural conversation points, and built-in breaks. Unlike movies (passive) or bars (loud), games facilitate genuine interaction. We've played through breakups, job changes, and a pandemic. Some nights we barely play—we just eat and talk. But having games as the 'excuse' to gather removes social pressure. You're not hosting to impress; you're playing to connect. My collection has grown to 50+ games, but it's not about the games—it's about the ritual. Every Friday, we choose presence over isolation. It's the best decision I've made for my mental health.",
    interests: ['gaming', 'social', 'mental-health']
  },
  {
    title: "The Economics of Happiness: What Money Can't Buy",
    content: "I doubled my salary last year and my happiness stayed the same. This puzzled me until I studied happiness economics. Research shows that beyond basic security ($75k annually in the US), more money doesn't increase well-being. Instead, happiness comes from time affluence, social connection, and purpose. I was earning more but working longer hours, seeing friends less, and feeling purposeless. So I made radical changes: I negotiated for four-day workweeks instead of a raise. I moved closer to work, trading space for time. I invested in experiences over possessions. The results? I'm measurably happier despite no income increase. Time with friends, morning walks, cooking real meals—these free or cheap activities bring more joy than any purchase. Consumer culture promises that happiness is for sale, but the economics prove otherwise. The best things in life aren't just free; they're often incompatible with the rat race. Choose wisely.",
    interests: ['finance', 'happiness', 'lifestyle']
  }
];

async function seedBlogPosts() {
  console.log('Starting blog post seeding...');

  const { data: currentUser, error: userError } = await supabase.auth.getUser();

  if (userError || !currentUser.user) {
    console.log('No authenticated user found. Please sign in first.');
    return;
  }

  const userId = currentUser.user.id;
  console.log('User ID:', userId);

  const { data: blogAccount, error: blogAccountError } = await supabase
    .from('blog_accounts')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle();

  if (blogAccountError) {
    console.error('Error checking blog account:', blogAccountError);
    return;
  }

  if (!blogAccount) {
    console.log('Creating blog account...');
    const { error: createError } = await supabase
      .from('blog_accounts')
      .insert({
        id: userId,
        username: `blogger_${Date.now()}`,
        display_name: 'Demo Blogger',
        bio: 'Exploring ideas through writing',
        interests: ['writing', 'technology', 'lifestyle', 'culture']
      });

    if (createError) {
      console.error('Error creating blog account:', createError);
      return;
    }
    console.log('Blog account created!');
  } else {
    console.log('Blog account exists:', blogAccount.username);
  }

  console.log('Creating sample blog posts...');
  let successCount = 0;

  for (const post of samplePosts) {
    const { error } = await supabase
      .from('blog_posts')
      .insert({
        account_id: userId,
        title: post.title,
        content: post.content,
        status: 'published',
        privacy: 'public',
        interests: post.interests,
        view_count: Math.floor(Math.random() * 500) + 50,
        like_count: Math.floor(Math.random() * 100) + 10
      });

    if (error) {
      console.error(`Error creating post "${post.title}":`, error);
    } else {
      successCount++;
      console.log(`✓ Created: ${post.title}`);
    }
  }

  console.log(`\n✨ Successfully created ${successCount} of ${samplePosts.length} blog posts!`);
  console.log('Visit /blog/feed or /blog/my-posts to see your Wheel of Blogs in action!');
}

seedBlogPosts().catch(console.error);
