-- Generated from the authored catalog; catalog version 1 is immutable.
do $catalog$ begin
if not exists(select 1 from private.catalog_versions where version=1) then
insert into public.quests(id,quest_version,catalog_version,title,instructions,attribute,effort,xp,focus_tags,repeatable) values
('strength-1',1,1,'Gentle mobility','Spend five minutes moving your shoulders, wrists and ankles through a comfortable range. Stay seated if preferred. Stop if anything hurts.','Strength','light',10,ARRAY['Strength'],true),
('strength-2',1,1,'Build a movement habit','Choose a comfortable movement such as walking or seated stretches. Practice for ten minutes at your own pace, with breaks whenever needed.','Strength','standard',15,ARRAY['Strength'],true),
('strength-3',1,1,'A steady posture break','Take three short posture breaks today. Relax your shoulders, change position and gently stretch only within a pain-free range.','Strength','light',10,ARRAY['Strength'],true),
('strength-4',1,1,'Plan your movement space','Spend fifteen minutes setting up a clear, safe place for movement. Remove trip hazards and choose one accessible activity for tomorrow.','Strength','standard',15,ARRAY['Strength'],false),
('strength-5',1,1,'Practice with patience','Spend twenty minutes on an easy movement you already know. Include a gentle start and finish. Rest as needed; completing the time is optional if you feel discomfort.','Strength','deep',25,ARRAY['Strength'],true),
('intelligence-1',1,1,'Read one useful idea','Read a short article or two pages of a book. Write one idea you could explain in your own words.','Intelligence','light',10,ARRAY['Intelligence'],true),
('intelligence-2',1,1,'Learn and recall','Spend ten minutes learning a small concept. Close the source and write three things you remember; reopen it to check.','Intelligence','standard',15,ARRAY['Intelligence'],true),
('intelligence-3',1,1,'Ask a better question','Choose something you do not understand. Write a precise question and find one reliable source that helps answer it.','Intelligence','light',10,ARRAY['Intelligence'],true),
('intelligence-4',1,1,'Practice a small skill','Spend twenty minutes practicing a skill you want to develop. Pick a manageable exercise and note what became easier.','Intelligence','deep',25,ARRAY['Intelligence'],true),
('intelligence-5',1,1,'Build a learning list','Make a list of three topics you want to explore. For each, save one reputable free resource and choose the first small step.','Intelligence','standard',15,ARRAY['Intelligence'],false),
('vitality-1',1,1,'A quiet breathing break','Sit comfortably for three minutes. Breathe naturally and notice the breath without holding it or forcing a rhythm.','Vitality','light',10,ARRAY['Vitality'],true),
('vitality-2',1,1,'Step into daylight','Spend ten minutes near a window or outdoors in a safe place. Avoid looking at the sun and follow your usual sun protection habits.','Vitality','standard',15,ARRAY['Vitality'],true),
('vitality-3',1,1,'Prepare for restful sleep','Spend ten minutes making your sleeping space comfortable. Choose a realistic wind-down time and put one distraction away.','Vitality','standard',15,ARRAY['Vitality'],true),
('vitality-4',1,1,'Make room for a meal','Take twenty unhurried minutes to prepare or enjoy a familiar meal that suits your needs. Notice its taste and take breaks from screens.','Vitality','deep',25,ARRAY['Vitality'],true),
('vitality-5',1,1,'Create a rest cue','Choose one simple evening cue, such as dimming a light or placing a book by your bed. Write when you will use it.','Vitality','light',10,ARRAY['Vitality'],false),
('charisma-1',1,1,'Offer a sincere thank-you','Thank someone for one specific action, in person or through a message you choose to send. Respect their time and privacy.','Charisma','light',10,ARRAY['Charisma'],true),
('charisma-2',1,1,'Listen with attention','In a conversation today, spend a few minutes listening without interrupting. Ask one respectful follow-up question. If no conversation is available, practice with a recorded interview.','Charisma','standard',15,ARRAY['Charisma'],true),
('charisma-3',1,1,'Practice a clear introduction','Write a two-sentence introduction about yourself and say it aloud once. Keep it natural and share only what you are comfortable sharing.','Charisma','light',10,ARRAY['Charisma'],true),
('charisma-4',1,1,'Reconnect thoughtfully','Spend fifteen minutes drafting a considerate check-in to someone you know. Sending it is optional; respect boundaries and do not expect a reply.','Charisma','standard',15,ARRAY['Charisma'],false),
('charisma-5',1,1,'Express an idea clearly','Spend twenty minutes outlining a small idea, then explain it aloud in two minutes. Listen back if comfortable and identify one way to be clearer.','Charisma','deep',25,ARRAY['Charisma'],true),
('perception-1',1,1,'Choose one priority','Write the one small action that would make today feel worthwhile. Make it specific and achievable in ten minutes or less.','Perception','light',10,ARRAY['Perception'],true),
('perception-2',1,1,'A focused ten minutes','Choose one manageable task. Put aside optional distractions and work on it for ten minutes, then note your next step.','Perception','standard',15,ARRAY['Perception'],true),
('perception-3',1,1,'Notice your surroundings','Spend three minutes noticing five ordinary details around you. Write one observation without judging it.','Perception','light',10,ARRAY['Perception'],true),
('perception-4',1,1,'Clear one source of friction','Spend fifteen minutes organizing a small surface or a folder you use often. Stop when the time is up and keep useful items accessible.','Perception','standard',15,ARRAY['Perception'],false),
('perception-5',1,1,'Review and reset','Spend twenty minutes reviewing your recent week. Write one thing that worked, one difficulty and one realistic adjustment for tomorrow.','Perception','deep',25,ARRAY['Perception'],true);
insert into private.catalog_versions(version) values(1);
end if;
end $catalog$;
