# Atlas - Your whole degree, mapped.

## Inspiration
Our inspiration came from our personal experience from review sections in our courses. In particular, we are both currently taking CPSC 213, which has the prerequisites CPSC 210, CPSC 121, and CPSC 110. The very first quiz in CPSC 213 is a review quiz based on those prerequisites. We both found it to be quite difficult because first, we had forgotten a lot of the content of the prerequisites, and second, there were not an adequate number of resources for the topics in the review. The lack of background knowledge has affected us because the course directly works off of the knowledge learned in previous classes.

## What it does
Atlas is a study tool that turns your course files into a map of everything you’re learning. You upload a syllabus, slides or notes, and it pulls out the topics and deadlines. It then links each idea to the ones you need to know first, even when they come from a different course or year. Open any topic and you can see what to know first and what it leads to. Atlas also builds study guides and quizzes from that map, so you review the right foundations before the harder material. The AI only suggests the links, and you keep or dismiss each one.

## How we built it
Our initial brainstorming process was first thought up between the two of us. After getting the gist of a basic idea we wanted to tackle, we brought our idea to gemini. It helped us narrow down the problem and create a general direction for the solution. With the ideas that gemini gave us, we brought it over to Claude in order to get a more sophisticated and thorough idea of how to bring our idea to life. We then used Claude Code to build help us build the basic scaffolding of our app. Our original UI design was created using Figma Frames. When we tried to use Claude to create the UI it looked horrible, so we gave it the emilkowalski and taste skills to help it with its decision-making. We used a Claude API to read uploaded files and create associations between ideas. We also had it run our quiz and study guide maker. Our backend was made with Next.js, TypeScript, and Tailwind. Postgres was on Tiger Cloud through Drizzle. We used auth0 to handle our login system. Vercel was used for hosting. We split the work into two jobs, Sameed was on a majority of the front-end, while Justin was primarily working on the back-end.

## Challenges we ran into
We found creating the UI to be quite difficult. When we gave Claude itself the task of creating a UI, it looked like complete "slop." It took us a lot of trial and error to make Claude do what we wanted it to do. Through all of this tedious work, we figured out that our prompts were very vague and not specific enough. Along with giving Claude skills to help it with designing, we made sure to make the prompts given as detailed as possible so it had the highest chance of giving us what we wanted. We specifically told it what we didn't like and what we did. We honestly appreciated learning this lesson the hard way since it directly showed us why its so important to make sure you prompt Claude correctly.

## Accomplishments that we're proud of
First and foremost, we are extremely proud of the fact that in our first hackathon we were able to get a running and functional product. We like how our product tackles and issue both of us have faced and we are really proud of how our project doesn't just have features for the sake of having them. We added features that make the app more usable. We are very proud of our UI animations as well.

## What we learned
We learned a great deal about creating over the past 24 hours. The both of us don't have very much experience creating something so sophisticated, so it was eye opening. We learned a lot about different tools that go into making functional apps. I especially learned a lot about services like auth0, which host login systems. We both learned a great deal about Git and how collaborative repositories work.

## What's next for atlas
Next, we want to make Atlas more reliable and more useful for the whole student body. We’ll finish testing the live AI features against real course data, and add a prompt during upload that asks students what a quiz or exam covers when Atlas isn’t sure, so more prerequisite links start out correct. We also want the map to show progress, using quiz results to highlight which prerequisites a student is still weak on.

## URL DEMO
https://www.myatlas.study/
