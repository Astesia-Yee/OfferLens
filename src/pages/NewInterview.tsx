import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Upload, Save } from 'lucide-react';
import { repository } from '../services/db';

export default function NewInterview() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company: '',
    position: '',
    round: '一面',
    date: Date.now()
  });

  const handleSave = async () => {
    if (!formData.company || !formData.position) {
      alert('请填写公司和岗位');
      return;
    }
    
    const id = await repository.addInterview(formData);
    navigate(`/interview/${id}`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-50 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">新建面试记录</h1>
        <div className="w-9"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">面试信息</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">公司名称 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="例如：腾讯、字节跳动"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">岗位名称 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="例如：前端开发工程师"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">面试轮次</label>
              <select
                className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                value={formData.round}
                onChange={(e) => setFormData({ ...formData, round: e.target.value })}
              >
                <option value="一面">一面</option>
                <option value="二面">二面</option>
                <option value="三面">三面</option>
                <option value="四面">四面</option>
                <option value="五面">五面</option>
                <option value="业务一面">业务一面</option>
                <option value="业务二面">业务二面</option>
                <option value="业务三面">业务三面</option>
                <option value="交叉面">交叉面</option>
                <option value="HR面">HR面</option>
                <option value="高管面">高管面</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-medium shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center"
        >
          <Save className="w-5 h-5 mr-2" />
          保存并进入详情
        </button>
      </main>
    </div>
  );
}
