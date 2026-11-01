#include <bits/stdc++.h>
using namespace std;
class Node{
    public:
    int data;
    Node*left;
    Node*right;
    
    Node(int data){
        this->data=data;
        this->left=NULL;
        this->right=NULL;
    }
};

Node *buildTree(){
    
    int data;
    cin>>data;
    if(data==-1) return NULL;
    Node *newNode=new Node(data);

    cout<<" Enter data for this Node left :"<<data<<endl;
    newNode->left=buildTree();
    
    cout<<" Enter data for this Node right :"<<data<<endl;
    newNode->right=buildTree();

    return newNode;


}
int main() {
  cout<<" Enter The data for root Node: "<<endl;
  Node *root=buildTree();
 // inorder traversal

   Node *curr=root;
   stack<Node *>st;
   while(!st.empty() || curr!=NULL){

    while(curr!=NULL){
        st.push(curr);
        curr=curr->left;
    }
    // Now curr is pointing to Null 
    curr=st.top();
    st.pop();
    cout<<curr->data<<" ";
    curr=curr->right;

   }
   cout<<endl;

   cout<<"Pre order will be"<<endl;
    curr=root;

   while(!st.empty() || curr!=NULL){
   
    while(curr!=NULL){
        cout<<curr->data<<" ";
        st.push(curr);
        curr=curr->left;
    }
    // Now curr is pointing to Null 
    curr=st.top();
    st.pop();
    curr=curr->right;

   }
   cout<<endl;

   cout<<"postorder using 2 stack"<<endl;
   stack<Node *>s1,s2;
   s1.push(root);
   while(!s1.empty()){
      Node*curr=s1.top();
      s1.pop();
      if(curr->left!=NULL) s1.push(curr->left);
       if(curr->right!=NULL) s1.push(curr->right);
       s2.push(curr);
   }
   while(!s2.empty()){
    cout<<s2.top()->data<<" ";
    s2.pop();
   }
   cout<<endl;

   cout<<"postorder using one stack"<<endl;
   s1=s2;
  curr=root;
   while(!s1.empty() || curr!=NULL){
      if(curr){
        s1.push(curr);
        curr=curr->left;
      }
      else{
        auto temp=s1.top()->right;
        if(temp) curr=temp;
        else{
            temp=s1.top();
            s1.pop();
            cout<<temp->data<<" ";
            while(!s1.empty() && s1.top()->right==temp){
                temp=s1.top();
                s1.pop();
                cout<<temp->data<<" ";
            }

        }
      }
   }





  return 0;
}