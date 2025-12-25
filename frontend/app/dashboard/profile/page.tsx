"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User, GraduationCap, Target, Palette, BookOpen, Brain, Briefcase, Users, Sparkles } from "lucide-react";
import { getApiUrl } from "@/lib/api";

const LEARNER_TYPES = [
  { value: "student", label: "Student", icon: GraduationCap, description: "Currently studying" },
  { value: "researcher", label: "Researcher", icon: Brain, description: "Academic research" },
  { value: "professional", label: "Professional", icon: Briefcase, description: "Career development" },
  { value: "teacher", label: "Teacher", icon: Users, description: "Educator" },
  { value: "hobbyist", label: "Hobbyist", icon: Sparkles, description: "Learning for fun" },
  { value: "entrepreneur", label: "Entrepreneur", icon: Target, description: "Building a business" },
];

const AGE_GROUPS = [
  { value: "child", label: "Child (5-12)", description: "Elementary school age" },
  { value: "teen", label: "Teen (13-17)", description: "High school age" },
  { value: "young_adult", label: "Young Adult (18-25)", description: "College age" },
  { value: "adult", label: "Adult (26-40)", description: "Early career" },
  { value: "mature_adult", label: "Mature Adult (41-60)", description: "Mid career" },
  { value: "senior", label: "Senior (60+)", description: "Retirement age" },
];

const LEARNING_STYLES = [
  { value: "visual", label: "Visual", description: "Learn through images and diagrams" },
  { value: "auditory", label: "Auditory", description: "Learn through listening" },
  { value: "kinesthetic", label: "Kinesthetic", description: "Learn through doing" },
  { value: "reading", label: "Reading/Writing", description: "Learn through text" },
];

const EDUCATION_LEVELS = [
  { value: "elementary", label: "Elementary School" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "graduate", label: "Graduate" },
  { value: "professional", label: "Professional" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    learner_type: "",
    age_group: "",
    preferred_learning_style: "",
    education_level: "",
    learning_goals: [] as string[],
    interests: [] as string[],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await axios.get(getApiUrl("api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile({
          learner_type: response.data.learner_type || "",
          age_group: response.data.age_group || "",
          preferred_learning_style: response.data.preferred_learning_style || "",
          education_level: response.data.education_level || "",
          learning_goals: response.data.learning_goals || [],
          interests: response.data.interests || [],
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    if (!profile.learner_type || !profile.age_group) {
      toast.error("Please select at least learner type and age group");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        getApiUrl("api/auth/profile"),
        profile,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success("Profile updated successfully!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) {
      return array.filter((i) => i !== item);
    }
    return [...array, item];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--neo-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase mb-2">Your Profile</h1>
        <p className="font-bold text-gray-600">Customize your learning experience</p>
      </div>

      <div className="space-y-8">
        {/* Learner Type */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            What type of learner are you? *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {LEARNER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = profile.learner_type === type.value;
              return (
                <button
                  key={type.value}
                  onClick={() => setProfile({ ...profile, learner_type: type.value })}
                  className={`
                    card-neo p-6 text-left transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white hover:bg-gray-50"}
                  `}
                >
                  <Icon size={32} className="mb-3" />
                  <div className="font-black text-lg mb-1">{type.label}</div>
                  <div className={`text-sm ${isSelected ? "text-white/90" : "text-gray-600"}`}>
                    {type.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Age Group */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            What is your age group? *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {AGE_GROUPS.map((group) => {
              const isSelected = profile.age_group === group.value;
              return (
                <button
                  key={group.value}
                  onClick={() => setProfile({ ...profile, age_group: group.value })}
                  className={`
                    card-neo p-4 text-left transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-secondary)] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white hover:bg-gray-50"}
                  `}
                >
                  <div className="font-black text-base mb-1">{group.label}</div>
                  <div className={`text-xs ${isSelected ? "text-black/80" : "text-gray-600"}`}>
                    {group.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Learning Style */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            Preferred Learning Style
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {LEARNING_STYLES.map((style) => {
              const isSelected = profile.preferred_learning_style === style.value;
              return (
                <button
                  key={style.value}
                  onClick={() => setProfile({ ...profile, preferred_learning_style: style.value })}
                  className={`
                    card-neo p-4 text-center transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-accent)] text-black border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white hover:bg-gray-50"}
                  `}
                >
                  <div className="font-black text-base mb-1">{style.label}</div>
                  <div className={`text-xs ${isSelected ? "text-black/80" : "text-gray-600"}`}>
                    {style.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Education Level */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            Education Level
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {EDUCATION_LEVELS.map((level) => {
              const isSelected = profile.education_level === level.value;
              return (
                <button
                  key={level.value}
                  onClick={() => setProfile({ ...profile, education_level: level.value })}
                  className={`
                    card-neo p-4 text-center transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white hover:bg-gray-50"}
                  `}
                >
                  <div className="font-black text-base">{level.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Learning Goals */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            Learning Goals (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-3">
            {["Exam Preparation", "Skill Development", "Career Advancement", "Research", "Personal Interest", "Teaching Others", "Certification", "Project Work"].map((goal) => {
              const isSelected = profile.learning_goals.includes(goal);
              return (
                <button
                  key={goal}
                  onClick={() => setProfile({ ...profile, learning_goals: toggleArrayItem(profile.learning_goals, goal) })}
                  className={`
                    px-4 py-2 font-bold border-[3px] border-black transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-secondary)] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white text-gray-700 hover:bg-gray-50"}
                  `}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="block font-black text-lg uppercase mb-4">
            Interests (Select all that apply)
          </label>
          <div className="flex flex-wrap gap-3">
            {["Science", "Technology", "Mathematics", "History", "Literature", "Arts", "Music", "Sports", "Business", "Health", "Language", "Philosophy"].map((interest) => {
              const isSelected = profile.interests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => setProfile({ ...profile, interests: toggleArrayItem(profile.interests, interest) })}
                  className={`
                    px-4 py-2 font-bold border-[3px] border-black transition-all
                    ${isSelected 
                      ? "bg-[var(--neo-accent)] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                      : "bg-white text-gray-700 hover:bg-gray-50"}
                  `}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={saving || !profile.learner_type || !profile.age_group}
            className="btn-neo bg-[var(--neo-primary)] text-white px-8 py-4 font-black uppercase text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-neo bg-white border-[3px] border-black px-8 py-4 font-black uppercase text-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

