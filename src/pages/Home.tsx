import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar, Building2, Briefcase, ChevronRight, ChevronDown, Star } from 'lucide-react';
import { format } from 'date-fns';
import { repository } from '../services/db';
import { Interview } from '../types';

export default function Home() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    const data = await repository.getInterviews();
    setInterviews(data);
  };

  const filteredInterviews = interviews.filter(i => 
    i.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.round.toLowerCase().includes(searchQuery.toLowerCase())
  );

  type GroupedInterviews = Record<string, Record<string, Interview[]>>;

  const groupedInterviews = filteredInterviews.reduce((acc, interview) => {
    if (!acc[interview.company]) {
      acc[interview.company] = {};
    }
    if (!acc[interview.company][interview.position]) {
      acc[interview.company][interview.position] = [];
    }
    acc[interview.company][interview.position].push(interview);
    return acc;
  }, {} as GroupedInterviews);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <header className="mb-6 pt-4 flex items-center space-x-3">
        <img src="/logo.svg" alt="OfferLens Logo" className="w-12 h-12 rounded-2xl shadow-md" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OfferLens</h1>
          <p className="text-xs text-gray-500 mt-0.5 font-medium">AI 面试复盘官</p>
        </div>
      </header>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-shadow"
          placeholder="搜索公司、岗位或轮次..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {interviews.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Array.from(new Set(interviews.flatMap(i => [i.company, i.position, i.round]))).slice(0, 5).map(tag => (
            <button
              key={tag}
              onClick={() => setSearchQuery(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                searchQuery === tag 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tag}
            </button>
          ))}
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              清除
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {filteredInterviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="mx-auto h-12 w-12 text-gray-300 mb-3 flex items-center justify-center bg-gray-50 rounded-full">
              <Briefcase size={24} />
            </div>
            <h3 className="text-sm font-medium text-gray-900">暂无面试记录</h3>
            <p className="mt-1 text-sm text-gray-500">点击右下角按钮开始记录你的第一次面试吧</p>
          </div>
        ) : (
          Object.entries(groupedInterviews).map(([company, positions]) => {
            const companyId = `company-${company}`;
            const isCompanyCollapsed = collapsedSections.has(companyId);
            const totalInterviews = Object.values(positions).flat().length;
            
            return (
              <div key={company} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                  onClick={() => toggleSection(companyId)}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center mr-3">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{company}</h2>
                      <p className="text-xs text-gray-500">{totalInterviews} 场面试</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    {isCompanyCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                
                {!isCompanyCollapsed && (
                  <div className="p-4 pt-2 space-y-4">
                    {Object.entries(positions).map(([position, interviewsList]) => {
                      const positionId = `pos-${company}-${position}`;
                      const isPositionCollapsed = collapsedSections.has(positionId);
                      
                      return (
                        <div key={position} className="relative">
                          <div 
                            className="flex items-center justify-between mb-2 cursor-pointer group"
                            onClick={() => toggleSection(positionId)}
                          >
                            <h3 className="text-sm font-bold text-gray-800 flex items-center">
                              <Briefcase className="w-4 h-4 mr-1.5 text-indigo-500" />
                              {position}
                            </h3>
                            <div className="text-gray-300 group-hover:text-gray-500">
                              {isPositionCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {!isPositionCollapsed && (
                            <div className="relative border-l-2 border-gray-100 ml-2 space-y-3 mt-2 mb-4">
                              {interviewsList.map((interview) => (
                                <div 
                                  key={interview.id} 
                                  className="relative pl-4 cursor-pointer group"
                                  onClick={() => navigate(`/interview/${interview.id}`)}
                                >
                                  {/* Timeline Dot */}
                                  <div className="absolute w-2.5 h-2.5 bg-white border-2 border-indigo-400 rounded-full -left-[6px] top-2 group-hover:bg-indigo-500 group-hover:border-indigo-500 transition-colors"></div>
                                  
                                  <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm group-hover:border-indigo-100 group-hover:shadow transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                      <h4 className="text-sm font-semibold text-indigo-600">
                                        {interview.round}
                                      </h4>
                                      {interview.score && (
                                        <div className="flex items-center bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-semibold">
                                          <Star className="w-3 h-3 mr-1 fill-indigo-500 text-indigo-500" />
                                          {interview.score}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                      <div className="flex items-center">
                                        <Calendar className="w-3.5 h-3.5 mr-1" />
                                        {format(interview.date, 'yyyy年MM月dd日 HH:mm')}
                                      </div>
                                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => navigate('/new')}
        className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all z-10"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
