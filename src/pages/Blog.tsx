import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PublicLayout from "@/components/layout/PublicLayout";

const blogs = [
  { title: "Why Construction Management is Important for Your Projects?", excerpt: "The importance of construction management is evident from the fact that more than a third of construction projects face significant delays and cost overruns.", category: "Construction", image: "/blog1.jpg", date: "Jan 15, 2026" },
  { title: "Why Are Planning and Scheduling Important in Construction?", excerpt: "Planning and scheduling are the backbone of any successful construction project. Without proper planning, projects can quickly spiral out of control.", category: "Construction", image: "/blog2.jpg", date: "Jan 10, 2026" },
  { title: "What is the Importance of Tunnel Construction?", excerpt: "Tunnel construction is one of the most complex and challenging aspects of civil engineering, requiring precise planning and execution.", category: "Engineering", image: "/blog3.jpg", date: "Jan 5, 2026" },
  { title: "How to Reduce Material Wastage on Construction Sites", excerpt: "Material wastage is one of the biggest challenges in construction. Learn proven strategies to minimize waste and maximize efficiency.", category: "Materials", image: "/blog1.jpg", date: "Dec 28, 2025" },
  { title: "Best Practices for Labour Management in Construction", excerpt: "Effective labour management can make or break a construction project. Discover the best practices that top construction companies follow.", category: "Labour", image: "/blog2.jpg", date: "Dec 20, 2025" },
  { title: "Digital Transformation in the Construction Industry", excerpt: "The construction industry is undergoing a massive digital transformation. Here's how technology is reshaping the way we build.", category: "Technology", image: "/blog3.jpg", date: "Dec 15, 2025" },
];

export default function Blog() {
  return (
    <PublicLayout>
      <section className="py-16 sm:py-20 md:py-28 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">Blog</Badge>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight mb-4">Insights & Resources</h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Tips, best practices, and industry insights for construction management.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, i) => (
              <Card key={i} className="overflow-hidden group cursor-pointer card-hover">
                <div className="overflow-hidden">
                  <img src={blog.image} alt={blog.title} className="w-full h-[200px] object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <CardContent className="pt-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="secondary" className="text-xs">{blog.category}</Badge>
                    <span className="text-xs text-muted-foreground">{blog.date}</span>
                  </div>
                  <h3 className="text-base font-semibold mb-2 leading-snug line-clamp-2">{blog.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{blog.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
