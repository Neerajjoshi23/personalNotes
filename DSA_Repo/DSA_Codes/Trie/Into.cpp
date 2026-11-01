class TrieNode{
    public:
     TrieNode *children[2];
     bool isTerminal;
     public:
     TrieNode(){
         children[0]=NULL;
         children[1]=NULL;
         isTerminal=0;
     }
};
class Trie{
    public:
    TrieNode* root; 
    public:
    Trie(){
        root=new TrieNode();
    }
    void insert(int num){
        if(root==NULL) root=new TrieNode();
     TrieNode* currNode=root;
     for(int i=30;i>=0;i--){
     int bit=((num&(1<<i))==0)?0:1;
       if(currNode->children[bit]==NULL){
           TrieNode *newNode=new TrieNode();
           currNode->children[bit]=newNode;
       } 
       currNode=currNode->children[bit];
    }
    currNode->isTerminal=true;

    }
    int getMax(int num){
        if(!root) return 0;
        int ans=0;
        TrieNode*currNode=root;
        for(int i=30;i>=0;i--){
           int bit=((num&(1<<i))==0)?0:1;
           bit=1-bit;
           if(currNode->children[bit]==NULL){
               bit=1-bit;
             } 
           else ans=ans|(1<<i);
           currNode=currNode->children[bit];
        }
        return ans;
    }
    
    bool isEmpty(TrieNode*r){
        if(r->children[0]==NULL && r->children[1]==NULL) return 1;
        else return 0;
    }
    
   TrieNode* remove(TrieNode* root, int num, int depth)
{
    // If tree is empty
    if (!root)
        return NULL;
 
   
    if (depth == -1) {
 
        // This node is no more end of word after
        // removal of given key
        if (root->isTerminal)
            root->isTerminal = false;
 
        // If given is not prefix of any other word
        if (isEmpty(root)) {
            delete (root);
        }
 
        return root;
    }
    int index = ((num&(1<<depth))==0)?0:1;
    root->children[index] = 
          remove(root->children[index], num, depth -1);
     
    // If root does not have any child (its only child got 
    // deleted), and it is not end of another word.
    if (isEmpty(root) && root->isTerminal == false) {
      //  cout<<depth<<" "<<"here"<<endl;
        delete (root);
        root = NULL;
    }
 
    return root;
}
 
};
class Solution {
public:
    int maximumStrongPairXor(vector<int>& nums) {
        int n=nums.size();
        sort(nums.begin(),nums.end());
        vector<int>num;
        for(int i=0;i<n;i++){
            if(i==0 || nums[i]!=nums[i-1]) num.push_back(nums[i]);
        }
        int reach=0;
        int ans=0;
         n=num.size();
        // cout<<n<<endl;
         Trie t;
        for(int i=0;i<n;i++){
            int ind=upper_bound(num.begin(),num.end(),2*num[i])-num.begin();
            while(reach<ind) t.insert(num[reach++]);    
            ans=max(ans,t.getMax(num[i]));
            t.root=t.remove(t.root,num[i],30);
        }
        return ans;
        
    }
};